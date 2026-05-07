# UbicaTEC — Plan Fase II

## Contexto

Fase II del proyecto IC-6821 (Diseño de Software, valor 35%). **Entrega: 2026-06-08 a las 07:00 — 35 días desde hoy (2026-05-04).**

Pasamos de mocks en Azure API Management (Fase I) a un backend distribuido en microservicios reales sobre Azure App Services. El cuadro azul del diagrama de referencia es lo que construiremos. La Fase I dejó pendientes detectados en review (paginación faltante, JWT validado solo en frontend, latencia de primera carga sin justificar, búsqueda en frontend) que se resuelven naturalmente al mover lógica al backend.

**Resultado esperado al cierre:** 4 microservicios desplegados detrás de APIM con mTLS, PWA con Web Push y WebSocket en tiempo real, colección Postman ejecutable y video demo de ≤5 min mostrando el flujo end-to-end.

---

## 1. Arquitectura objetivo

```
PWA (React+Vite, Service Worker)
   │ HTTPS                      │ WSS (bypass APIM, documentado)
   ▼                            │
Azure API Management ──────────┐│
   │ mTLS (cert por MS)        ││
   ▼                           ▼▼
Auth MS ─────► Azure SQL    Notifications MS ─► Service Bus (queue + topic)
Events MS ───► Cosmos DB                       └► Table Storage
Map MS ──────► Redis Cache                     └► Web Push (VAPID)
```

**Distribución del equipo (4 MS, 3 personas):**
| Componente | Owner | Stack | Almacenamiento |
|---|---|---|---|
| Auth MS | Kevin | Spring Boot 3 + Java 21 (hexagonal **obligatorio**) | Azure SQL Database |
| Events MS | Armando | Node.js 20 + Express + Mongoose | Azure Cosmos DB (Mongo API) + **Azure Blob Storage** (banners) |
| Map MS | Angie | Python FastAPI ✓ confirmado por profe | Azure Cache for Redis |
| Notifications MS | Angie | Python FastAPI | Azure Service Bus + Azure Table Storage |
| n8n + Gmail SMTP para email OTP | **Angie owner total** | n8n cloud free + Gmail App Password | webhook → SMTP node |
| Frontend + Service Worker (push) | **Angie** | React 19 + Vite + SW minimal | — |

> **Carga de Angie:** Map MS + Notifications MS + setup n8n + frontend completo (badge + sección notificaciones + SW para push + todos los pendientes review). Es la persona con más superficie; Kevin (solo Auth, pero hexagonal+mTLS+JWT issuer es complejo) y Armando (Events con paginación server-side y publisher de Service Bus) tienen scope más acotado.

**Tipos de almacenamiento distintos: 6** (SQL, NoSQL document, Blob/object storage, Cache, Queue/Topic, NoSQL key-value) — supera el mínimo de 3 del rubro.

**Decisiones cerradas (confirmadas con profe):**
- **No hace falta PWA**. La web actual sirve como "mobile". Solo agregamos: (a) badge tipo Facebook con contador en el header, (b) sección/página de notificaciones, (c) push notifications via Web Push API (que requiere un Service Worker minimal — no PWA completa).
- Map y Notifications **ambos en Python FastAPI** (profe confirmó que el mismo stack en dos MS no es problema).
- **Costos distribuidos entre los 3**: cada persona crea su propia subscripción Azure for Students ($100 USD crédito c/u, total $300). Cada quien hospeda los recursos de su MS en su subscripción.
- **APIM upgrade a Developer tier** (~50 USD/mes) para soportar WebSocket passthrough. Estrategia de costo: encender/apagar on-demand — solo activarla durante integración semanal, demos y semana final del video. Mientras tanto, cada MS se desarrolla en local y el frontend hace fetch directo a su App Service (sin APIM) para que no consuma crédito. APIM se hospeda en la subscripción de Angie (la que tiene Notifications, que es quien más necesita el WS).
- Triggers de notificación: (a) **RSVP** (queue, personal) + (b) **Creación de evento** (topic, broadcast).
- WS de Notifications **sí pasa por APIM Developer tier** (mantiene la regla "exclusivamente vía APIM" del rubro).

---

## 2. Microservicios — detalle

### 2.1 Auth (Kevin) — Spring Boot 3, hexagonal

**Endpoints (`/v1/auth`):**
- `POST /send-code` → genera OTP, lo persiste hasheado, dispara webhook a n8n.
- `POST /verify-code` → devuelve `{accessToken, refreshToken, user}`. Access TTL 60min, refresh 30d.
- `POST /refresh`
- `POST /logout`
- `GET /me` (Bearer)
- `GET /.well-known/jwks.json` → llaves públicas RS256 para que los demás MS validen JWT.

**Layout hexagonal (`com.ubicatec.auth`):**
```
domain/{model, port/in, port/out}
  - User, OtpChallenge, RefreshToken, Role
  - SendCodeUseCase, VerifyCodeUseCase, RefreshTokenUseCase
  - UserRepositoryPort, OtpRepositoryPort, EmailNotifierPort, TokenIssuerPort, ClockPort
application/service/
  - SendCodeService, VerifyCodeService, RefreshTokenService
infrastructure/adapter/
  - in/web/AuthController, DTOs, GlobalExceptionHandler
  - out/persistence/UserJpaAdapter, OtpJpaAdapter (entidades + Spring Data)
  - out/email/N8nWebhookEmailAdapter (+ SmtpFallbackAdapter)
  - out/security/RsaJwtIssuerAdapter (RS256, KeyPair desde Key Vault)
  - config/BeanConfig (cablea ports → adapters)
```

**Schema SQL (Flyway `V1__init.sql`):**
- `users(id UUID, email UNIQUE, role, created_at, last_login_at)`
- `otp_challenges(id, email, code_hash, expires_at, attempts, consumed_at)`
- `refresh_tokens(id, user_id FK, token_hash, expires_at, revoked_at)`

**Claims JWT:** `sub`, `email`, `role` (STUDENT/ADMIN), `iss=ubicatec-auth`, `aud=ubicatec`, `exp`. Algoritmo **RS256** (no HS256 — con 4 MS, manejar secreto compartido es frágil).

**n8n + Gmail SMTP para email OTP:** Auth MS dispara webhook a n8n; n8n ejecuta workflow que envía vía Gmail SMTP. **Setup completo: Angie**. Sección 3.5 abajo tiene el contrato exacto Auth ↔ n8n.

### 2.2 Events (Armando) — Node.js + Express + Mongoose

**Sobre la elección de "Mongo":** Armando quiere usar Mongo. La elección concreta es **Azure Cosmos DB con Mongo API**, no MongoDB Atlas.
- **DX idéntico a Mongo**: Mongoose funciona sin cambios, mismas queries, mismos operadores (`$inc`, `$set`, `$regex`), mismos índices, mismo aggregation framework.
- **Por qué Cosmos y no Atlas**: el rubro exige "tres tipos de servicios de datos **en Azure**". Atlas es servicio externo y no califica para ese criterio. Cosmos Mongo API sí cuenta como Azure NoSQL.
- **Justificación de NoSQL para Events**: schema flexible (badges, tags, organizer fields que evolucionan), decremento atómico de `available` con `$inc + filter {available: $gt: 0}`, índice de texto para `?search=`, y futuros campos sin migración.
- **Free tier**: 1000 RU/s + 25 GB (1 instancia gratis por subscripción Azure). Si Armando ya la usó, fallback a Cosmos pago básico (~24 USD/mes) o cambiar a Cosmos SQL API.

**Endpoints (`/v1/events`):**
- `GET /?page=1&limit=10&type=&date=&buildingId=&search=&sort=date` → server-side pagination + filtering. Respuesta: `{data, page, limit, total, totalPages}`. **Resuelve el pendiente de paginación de Fase I.**
- `GET /:id`
- `POST /` (admin) → publica `event.created` en Service Bus topic `events`.
- `PUT /:id`, `DELETE /:id` (admin)
- `POST /:id/rsvp` → `$inc: {available: -1}` con guard `available > 0`, publica `rsvp.confirmed` en Service Bus queue.
- `GET /mine` → eventos del usuario autenticado.
- `POST /:id/banner` (admin, multipart/form-data) → sube imagen del banner a Azure Blob Storage, retorna `{bannerUrl}` y actualiza el documento del evento.
- `DELETE /:id/banner` (admin) → borra blob y limpia el campo en Cosmos.

**Azure Blob Storage para banners:**
- Storage Account: `ubicateceventsstorage` (subscripción de Armando).
- Container: `event-banners`, acceso público de lectura (Blob anonymous read).
- Naming: `{eventId}/{timestamp}-{slug}.jpg` (versiona implícitamente al re-subir).
- Validaciones server-side: `image/jpeg`, `image/png`, `image/webp`, max 2 MB.
- URL pública: `https://ubicateceventsstorage.blob.core.windows.net/event-banners/{eventId}/...`. Se persiste en `Event.bannerUrl`.
- SDK: `@azure/storage-blob` en Node.

**Schemas:**
```js
Event { _id, title, description, longDescription, type, date, startHour, endHour,
        buildingId, buildingName, roomId, roomName, organizer, capacity, available,
        price, featured, secure, bannerUrl, createdBy, createdAt, updatedAt }
Rsvp  { _id, eventId, userId, email, createdAt — unique(eventId, userId) }
```
Índice de texto en `title` + `description` para `?search=`.

**JWT:** validador (rol = validador) — middleware con `jose` + JWKS cache 10min.

### 2.3 Map (Angie) — FastAPI + Redis

**Endpoints (`/v1/map`):**
- `GET /campus` → desde Redis key `campus:v1`.
- `GET /pathways` → desde `pathways:v1`.
- `GET /search?q=&limit=12` → mueve `searchAll()` del frontend al backend (Fase I review).
- `GET /route?fromBuildingId=&toBuildingId=` → A* sobre el grafo cacheado, regresa array de coords. Mueve pathfinding del frontend al backend.

**Startup:** lee `mocks/campus-mock.json` + `pathways-mock.json` (incluidos en la imagen del MS), `SETEX` en Redis con TTL 24h. Re-seed si Redis devuelve 404.

**JWT:** validador (read-only, pero igual gateado por consistencia).

### 2.4 Notifications (Angie) — FastAPI + Service Bus + Table Storage + WS + Web Push

**Endpoints HTTP (`/v1/notifications`):**
- `GET /?unread=true&limit=20` → query Table Storage por `PartitionKey=email`.
- `POST /:id/read`
- `GET /vapid-key` → llave pública VAPID para `pushManager.subscribe`.
- `POST /subscribe` → persiste suscripción en `PushSubs`.
- `DELETE /subscribe`

**WebSocket:** `wss://ubicatec-gateway.azure-api.net/v1/notifications/ws?token=<jwt>` (a través de APIM Developer tier, token en query string porque la WS API del browser no permite headers). Reconnect-with-backoff del lado cliente.

**Worker en `lifespan`:** dos `ServiceBusReceiver` corriendo en paralelo:
1. Queue `rsvp-confirmations` → notificación personal: persiste en Table Storage, push WS al socket del usuario, Web Push a sus suscripciones.
2. Topic-subscription `events.notifier` → broadcast: persiste N filas (una por usuario activo), broadcast WS, Web Push fan-out.

**Graceful shutdown (importante):** el handler de mensajes hace `await message.complete()` **solo después** de persistir + emitir WS + enviar push exitosamente. Si llega SIGTERM (deploy/scale-in) en medio de un mensaje, el `lifespan` cierra los receivers con `await receiver.close()` y el mensaje se libera al lock-timeout para reintento por otra instancia. Entrega es **at-least-once** — el cliente debe deduplicar por `notification.id`.

**Tablas:**
- `Notifications` (PK=email, RK=ulid; fields: title, body, kind, eventId, read, createdAt)
- `PushSubs` (PK=email, RK=hash(endpoint); fields: endpoint, p256dh, auth)

---

## 3. Cross-cutting

### APIM (Developer tier, encender on-demand)
| Path | Backend |
|---|---|
| `/v1/auth/*` | ubicatec-auth.azurewebsites.net |
| `/v1/events/*` | ubicatec-events.azurewebsites.net |
| `/v1/map/*` | ubicatec-map.azurewebsites.net |
| `/v1/notifications/*` (HTTP) | ubicatec-notif.azurewebsites.net |
| `/v1/notifications/ws` (WSS) | ubicatec-notif.azurewebsites.net (passthrough soportado en Developer+) |

**Política de costo APIM**: tier Developer (~50 USD/mes). El recurso se crea en sem 1 para validar configuración, luego se **deja apagado/eliminado entre integraciones**. Se enciende cada viernes para integración del equipo, y full-time en sem 5 para grabar el video. Recrear APIM toma ~30-45 min — guardar la configuración exportada como ARM/Bicep template para re-deploy rápido.

### mTLS APIM ↔ App Service
- Cert self-signed per MS (CA del equipo, está bien para curso).
- Subir `.pfx` en APIM como Client Certificate.
- Inbound policy por API: `<authentication-certificate thumbprint="..."/>`.
- App Service: "Incoming client certificates → Required" (requiere **Basic B1+**, F1 no soporta).
- Validar thumbprint en middleware: Spring `X509AuthenticationFilter`, FastAPI dependency leyendo `X-ARR-ClientCert`, Express leyendo `req.headers['x-arr-clientcert']`.

### JWT propagation
Auth firma RS256, expone JWKS público. Los otros 3 MS hacen JWKS fetch + cache 10min. Librerías: `jjwt` (Java), `jose` (Node), `python-jose`/`authlib` (Py).

### Service Bus topology
- **Queue** `rsvp-confirmations` (point-to-point, 1 consumer = Notifications MS).
- **Topic** `events` con subscription `events.notifier` (permite fan-out futuro sin tocar el publisher).

Justificación de Service Bus vs Storage Queue: necesitamos topic+subscriptions, dead-letter, scheduled messages — Service Bus es la opción correcta.

### Web Push (VAPID)
- Generar keypair una vez (`web-push generate-vapid-keys`), llave privada en App Service Configuration de Notifications.
- Web: `pushManager.subscribe({applicationServerKey: VAPID_PUB_KEY})` → POST a `/subscribe`.
- iOS Safari: solo funciona si el usuario hizo "Add to Home Screen" (iOS 16.4+). Demo principal en Chrome desktop/Android.

### Observability — logs estructurados + Application Insights

Cada MS escribe a stdout en JSON estructurado y App Service auto-shippea a Application Insights. Los 4 MS comparten un workspace de Log Analytics para queries cross-service.

**Por stack:**
- Auth (Spring Boot): `logback-spring.xml` con `LogstashEncoder`, dependencia `net.logstash.logback:logstash-logback-encoder`.
- Events (Express): `pino` (`pino-pretty` en dev, JSON en prod).
- Map / Notifications (FastAPI): `structlog` con `JSONRenderer`.

**Correlation ID:** middleware en cada MS lee/genera header `X-Request-Id` y lo agrega a todos los logs y a los mensajes de Service Bus (`message.application_properties["correlationId"]`). Permite trazar un evento end-to-end: `traces | where customDimensions.correlationId == "..."`.

**Configuración App Insights:** un solo recurso `ubicatec-insights` en la subscripción de Angie. Cada App Service apunta vía connection string en App Service Config (`APPLICATIONINSIGHTS_CONNECTION_STRING`). Auto-instrumentación captura HTTP requests, dependencies (Cosmos/Redis/Service Bus) y excepciones sin código adicional.

**En el video demo:** mostrar una query en App Insights filtrando por `correlationId` del flujo "admin crea evento → notification entregada" — visualiza que los 4 MS colaboran.

### 3.5 n8n + Gmail SMTP para email OTP — contrato Auth ↔ n8n

**Setup que hace Angie:**
1. Crear cuenta en n8n.cloud (free tier) o auto-hostear en Azure Container Apps. Recomendado: n8n.cloud.
2. Crear cuenta Gmail dedicada `ubicatec.notifs@gmail.com` (o usar una existente del equipo).
3. Activar 2FA en esa cuenta y generar **App Password** (Settings → Security → 2-Step Verification → App passwords). Guardar los 16 caracteres.
4. En n8n, crear el workflow descrito abajo y publicarlo (Activate workflow). Obtener URL del Webhook.
5. Generar un **shared secret** aleatorio (32+ chars) para autenticar el webhook. Guardarlo en variables de n8n.
6. **Entregar a Kevin:**
   - URL del webhook (ej. `https://ubicatec.app.n8n.cloud/webhook/auth-otp`)
   - Shared secret (lo manda en header `X-Webhook-Token`)

**Workflow en n8n:**
```
Webhook (POST /auth-otp)
  ↓
IF node — validar header X-Webhook-Token == $env.WEBHOOK_SECRET
  ↓ (pass)               ↓ (fail)
Send Email (Gmail SMTP)   Respond Webhook 401
  ↓
Respond Webhook 200 con {sent: true, messageId: $node["Send Email"].messageId}
```

**Configuración del Send Email node (Gmail SMTP):**
- Host: `smtp.gmail.com`
- Port: `587`
- User: `ubicatec.notifs@gmail.com`
- Password: App Password (16 chars)
- SSL/TLS: STARTTLS
- From: `UbicaTEC <ubicatec.notifs@gmail.com>`
- To: `={{$json.body.to}}`
- Subject: `UbicaTEC - Tu código de verificación`
- HTML body: ver template abajo

**Template HTML del email** (n8n soporta interpolación `{{...}}`):
```html
<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;">
  <h2 style="color:#16213e;">Tu código de verificación</h2>
  <p>Hola, ingresa este código en UbicaTEC para completar tu inicio de sesión:</p>
  <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#e94560;
              text-align:center;padding:16px;background:#f8f9fa;border-radius:8px;">
    {{$json.body.code}}
  </div>
  <p style="color:#666;font-size:14px;">Expira en {{$json.body.expiresInMinutes}} minutos.
     Si no solicitaste este código, ignora este correo.</p>
</div>
```

---

**Contrato HTTP — esto es lo que Kevin implementa en su `N8nWebhookEmailAdapter`:**

**Request (Auth MS → n8n):**
```http
POST https://ubicatec.app.n8n.cloud/webhook/auth-otp
Content-Type: application/json
X-Webhook-Token: <shared-secret-de-Angie>

{
  "to": "estudiante@estudiantec.cr",
  "code": "123456",
  "expiresInMinutes": 10
}
```

**Response success (200):**
```json
{ "sent": true, "messageId": "<smtp-message-id>" }
```

**Response error (401 / 5xx):**
```json
{ "sent": false, "error": "invalid token" | "smtp failure" | "..." }
```

**Comportamiento esperado de Kevin:**
- Timeout HTTP: 10 segundos.
- Si n8n responde 200 con `sent: true` → marcar OTP como enviado en BD.
- Si responde 401, 4xx, 5xx, o timeout → log + retornar error al usuario "no pudimos enviar el código, intenta de nuevo".
- **No reintentar automáticamente** desde el adapter (evita doble email si n8n sí envió pero la respuesta se perdió).

**Variables que Angie le pasa a Kevin (env vars en App Service Configuration, NO commiteadas):**

`application.yml` (en repo) usa solo placeholders:
```yaml
ubicatec.email.n8n:
  webhook-url: ${N8N_WEBHOOK_URL}
  webhook-secret: ${N8N_WEBHOOK_SECRET}
  timeout-ms: ${N8N_TIMEOUT_MS:10000}
```

Valores reales en App Service Configuration (Spring inyecta automáticamente desde env):
- `N8N_WEBHOOK_URL=https://ubicatec.app.n8n.cloud/webhook/auth-otp`
- `N8N_WEBHOOK_SECRET=<secret>` (mismo que en n8n)
- `N8N_TIMEOUT_MS=10000`

Aplica el mismo patrón a JWT keypair, conn strings, VAPID keys, etc. — **nada con valores literales en repo**.

**Testing antes de integrar (Angie en semana 1-2):**
1. Mandar OTP de prueba a `angie@estudiantec.cr` desde el "Test Workflow" de n8n.
2. Verificar que llega a la bandeja de entrada (no spam).
3. Si cae en spam, ajustar SPF/DKIM en Gmail (suelen estar OK por default) o cambiar el dominio del From.
4. Repetir con correo de Kevin y Armando antes de declarar listo.

---

## 4. Frontend (web — no PWA completa, profe lo confirmó)

**Service Worker minimal** (solo para Web Push, no Workbox/no manifest/no offline/no install prompt):
- Archivo único `public/sw.js` registrado desde `main.jsx`.
- Maneja únicamente: `push` event → `self.registration.showNotification(title, {body, icon, data: {url}})` y `notificationclick` → `clients.openWindow(url)`.
- ~30 líneas de código. No hay caching strategies ni precache manifest.

**UI de notificaciones (estilo Facebook):**
- Header: icono de campana con badge numérico (cuenta de no-leídas). Click → abre dropdown/panel con últimas 10 notificaciones, link a "Ver todas".
- Nueva ruta `/notificaciones` → página completa con scroll infinito (paginación contra `GET /notifications?limit=20&page=N`).
- Cada item: ícono según tipo (RSVP / nuevo evento), título, body, timestamp relativo, indicador de no-leída, click navega al evento o marca como leída.

**Real-time + push:**
- `services/notificationService.js`: WebSocket con reconnect-backoff (`wss://ubicatec-gateway.azure-api.net/v1/notifications/ws?token=`). Al recibir mensaje, actualiza badge count y dispatcha `CustomEvent('ubicatec:notification')`.
- Si la pestaña está visible → toast in-page (sutil, esquina inferior derecha).
- Si la pestaña está oculta o cerrada → Web Push (vía SW) muestra notificación del sistema operativo.
- Subscripción Web Push: después de login, pedir `Notification.permission`, llamar `pushManager.subscribe({applicationServerKey: VAPID_PUB_KEY})`, POST a `/notifications/subscribe`.

**Componentes nuevos:**
- `components/notifications/NotificationBell.jsx` (header)
- `components/notifications/NotificationDropdown.jsx`
- `components/notifications/NotificationsPage.jsx`
- `components/notifications/NotificationToast.jsx`
- `hooks/useNotifications.js` (estado global del badge count)

**Pendientes Fase I (todos en este monorepo, owner: Angie):**

Frontend:
- [`frontend/src/App.jsx`] — login al inicio del flujo: si no autenticado, redirect a `/login` antes de Splash.
- [`frontend/src/components/map/MapView.jsx`] — `minZoom` -1.
- [`frontend/src/services/eventService.js`] — eliminar bloque localStorage TEMPORAL (líneas 15-38, lógica en CRUDs); llamar al backend real; eliminar `filterEvents`/`paginateEvents` (mover a server-side).
- [`frontend/src/components/events/EventsPage.jsx`] — controles de paginación + filtros en URL state.
- [`frontend/src/services/mapService.js`] — eliminar A* cliente, llamar `/map/route` y `/map/search`.
- Nuevo `LoadingBar` en `AppLayout` ligado a contador global de fetches.
- [`FloorSelector`] — etiqueta "Piso 1 de 2" en lugar de "1/2".
- Header: integrar icono de perfil → menú con logout, mis eventos, badge de notificaciones.
- [`frontend/.env.local.example`] — unificar a `VITE_API_GATEWAY_URL`, `VITE_API_KEY`, `VITE_WS_URL`, `VITE_VAPID_PUBLIC_KEY`.
- [`frontend/src/services/authService.js`] — quitar `IS_LOCAL` bypass, `ADMIN_EMAILS` hardcode, `getRole()` local; rol viene del JWT.

Backend:
- JWT validado server-side en cada MS (middleware).
- Justificación de latencia: documentar cold-start de Spring Boot + APIM Consumption (8-15s primera petición). Mitigación: keep-alive cada 4min vía GitHub Action ping.
- n8n para envío de OTP (con fallback SMTP).

---

## 5. Repos y CI/CD

| Repo | Owner | Pipeline |
|---|---|---|
| `UbicaTEC` (este monorepo) | shared | Ya configurado: GH Actions → Azure Static Web Apps |
| `ubicatec-auth-service` (existente Kevin) | Kevin | Maven test → `az webapp deploy` |
| `ubicatec-events-service` (existente Armando) | Armando | npm ci + jest → zip-deploy |
| `ubicatec-map-service` (**crear**) | Angie | pip + pytest → docker → ACR → Web App for Containers |
| `ubicatec-notifications-service` (**crear**) | Angie | igual que map |

Ramas: `main` (protegido, deploy prod), `develop`, feature branches. PR con CI verde para mergear.

---

## 6. Colección Postman

```
UbicaTEC Phase II/
  00 - Auth/        Send Code, Verify Code, Refresh, Me
  01 - Events/      List (?page&filter), Get, Create, RSVP, My Events
  02 - Map/         Campus, Pathways, Search, Route
  03 - Notif/       List, Mark Read, VAPID Key, Subscribe
  99 - E2E/         Login → Create Event → RSVP → Get Notifications
```
Env vars: `gateway`, `apiKey`, `accessToken`, `refreshToken`, `studentEmail`, `adminEmail`, `eventId`. Pre-request a nivel de colección: refrescar token si expiró. Verify Code guarda `accessToken` vía test script.

---

## 7. Riesgos y gotchas

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | Spring Boot cold start 8-15s en Consumption tier (causó la latencia de Fase I) | Always-On en B1, o keep-alive ping cada 4min vía GH Action |
| 2 | mTLS no funciona en F1 | Forzar B1+ para todos los MS |
| 3 | WS por APIM Consumption no soportado | Bypass directo al App Service. **Confirmar con profe antes de submit.** |
| 4 | iOS Safari y Web Push (~~requiere PWA instalada~~ ya no aplica: profe dijo que la web sirve como mobile, demo en Chrome desktop/Android) | Demo principal en Chrome; documentar limitación de iOS Safari sin "Agregar a pantalla de inicio" |
| 5 | Cosmos DB free tier: solo 1 instancia gratis por subscripción Azure | Cada quien tiene su propia subscripción, Armando la usa para Cosmos |
| 6 | n8n.cloud caída → no se envía OTP → no hay login durante demo | Workflow probado con anticipación. En caso extremo durante demo: Angie tiene exportado el workflow JSON y puede hostear local en 5 min (n8n vía npx). Gmail SMTP es directo, n8n solo orquesta. |
| 6b | Gmail rate-limit (~100/día desde cuenta gratuita) | Para demo no se acerca al límite. Si en prod necesitamos más, switch a SendGrid free tier (100/día también pero por API). |
| 6c | Email cae en spam del TEC | Testing temprano (semana 2 día 1). SPF/DKIM viene auto con Gmail. From visible: `UbicaTEC <ubicatec.notifs@gmail.com>`. |
| 7 | ~~Map y Notif ambos Python FastAPI~~ | **Resuelto**: profe confirmó que está bien |
| 8 | Costo Azure | Distribuido en 3 subscripciones Azure for Students ($100 c/u, total $300). APIM Developer (~50/mes) encendido on-demand. Map+Notif comparten App Service Plan B1 dentro de la subscripción de Angie. Apagar Redis y APIM cuando no se está demoeando. |
| 9 | JWKS cache bugs entre 3 stacks | Usar libs probadas (jjwt, jose, python-jose) |
| 10 | `ADMIN_EMAILS` hardcoded en frontend | Eliminar; rol viene del claim del JWT |

---

## 7.5 Trade-offs arquitectónicos aceptados

Auditoría 12-factor del plan: 7.5/12 fuerte, con 4 grietas. Implementamos las 3 baratas (graceful shutdown, structured logs/App Insights, `${VAR}` substitution); las siguientes las **aceptamos como deuda consciente** porque agregan complejidad desproporcionada para un proyecto de 5 semanas:

| Trade-off | Costo de implementar bien | Por qué lo aceptamos | Riesgo si pasa | Cómo mencionarlo en el video |
|---|---|---|---|---|
| **Notifications WS no escala horizontalmente** (factor 6/8: procesos stateless / concurrency). Las conexiones WS viven en memoria del proceso; con 2+ instancias, broadcasts de la instancia A no llegan a clientes de la B. | Backplane Redis Pub/Sub: ~3h de código + tests. | En producción no necesitamos escalar más allá de 1 instancia para 200 estudiantes activos. El problema solo aparece con scale-out. | Si en demo levantamos 2 instancias, broadcasts inconsistentes. **Mitigación: 1 sola instancia en App Service Plan.** | "Para escalar horizontal usaríamos Redis Pub/Sub como backplane — siguiente paso de producción." |
| **Cold start Spring Boot 8-15s** (factor 9: disposability). Auth MS tarda ~10s en arrancar; primera petición tras idle es lenta. | Cambiar a Quarkus o GraalVM native image: ~1-2 días de migración. | Spring Boot hexagonal es **requisito del rubro**, no podemos cambiar el framework. Quarkus + hexagonal es viable pero fuera de scope. | Primera petición lenta en demo se ve mal. **Mitigación: GitHub Action keep-alive cada 4 min para que nunca duerma.** | "Spring Boot tiene cold start; lo mitigamos con keep-alive scheduled. En prod usaríamos Always On (B1+) o Quarkus native." |
| **Sin docker-compose para dev local** (factor 10: dev/prod parity). Cada dev levanta su MS contra Azure real (Cosmos, Redis, Service Bus de prod). | Compose con Mongo, Redis, Azurite, SB Emulator: ~2h. Mantenerlo: continuo. | El equipo es 3 personas trabajando en MS distintos; cada uno solo necesita su backing service. Azure for Students cubre el costo de dev. Compose multiplicaría el setup inicial. | Si cuota de Azure for Students se agota, dev queda bloqueado hasta recargar. | No mencionar (no es algo que el rubro evalúe). |
| **Flyway corre en startup, no como step de CI** (factor 12: admin processes). | Mover a `mvn flyway:migrate` como step previo al deploy: ~1h. | Para cambios pequeños y poca data, startup migration es operacionalmente más simple. El smell solo importa cuando una migración tarda >app startup timeout. | Migración lenta podría tumbar el liveness probe. **Mitigación: migraciones pequeñas e idempotentes.** | No mencionar a menos que pregunten. |
| **Entrega at-least-once de notificaciones** (factor 9). Service Bus puede reintregar el mismo mensaje si el worker muere antes de `complete()`. | Idempotencia transaccional con outbox pattern: ~1 día. | Es comportamiento estándar de mensajería; el cliente deduplica por `notification.id` (UI ya hace esto naturalmente al insertar en lista por id). | Notificación duplicada visible en UI raramente. | "Service Bus garantiza at-least-once; deduplicamos en cliente por id." |

**Filosofía:** preferimos sistema sólido en los 6-7 ejes que importan al rubro y al demo (logs, config, dependencies, backing services, JWT/security, notificaciones funcionales) que sistema mediocre en los 12. Los trade-offs los mencionamos honestamente en el video — un equipo que sabe lo que NO está haciendo y por qué se ve mejor que uno que pretende cubrir todo.

---

## 8. Sprint plan (5 semanas)

**Semana 1 (May 4-10) — Scaffolding + infra**
- Angie: resource group, APIM, Service Bus namespace + queue + topic, Table Storage, Redis, 3 App Service plans (Auth solo, Events solo, Map+Notif compartido). Generar certs mTLS. **Crear recurso Application Insights compartido** y compartir `APPLICATIONINSIGHTS_CONNECTION_STRING` con Kevin y Armando.
- Kevin: skeleton Spring Boot hexagonal, Flyway, JWT issuer + JWKS endpoint funcional local. **Setup `logback-spring.xml` con LogstashEncoder y middleware de `X-Request-Id`.**
- Armando: skeleton Express + Mongoose + conexión Cosmos + middleware JWT validator. **Setup `pino` JSON logging + middleware de `X-Request-Id`.**
- All: crear los 2 repos backend nuevos + CI/CD scaffolding. **Configurar todos los secrets/connection strings vía App Service Configuration (env vars), nunca commitear valores literales.**

**Semana 2 (May 11-17) — Core endpoints**
- Kevin: send-code, verify-code, refresh, me. Integrar webhook n8n vía `N8nWebhookEmailAdapter` siguiendo el contrato de la sección 3.5 (URL + secret provistos por Angie). Deploy a App Service.
- Armando: CRUD completo + paginación + filtering server-side. Service Bus publisher. Endpoints de banner (POST/DELETE `/:id/banner`) + Azure Blob Storage container `event-banners`.
- Angie: Map MS endpoints + Redis seed. Notifications MS skeleton + Service Bus consumer. **Setup completo n8n + Gmail SMTP** (ver sección 3.5): cuenta Gmail dedicada, App Password, workflow en n8n.cloud, testing de deliverability a TEC. Entrega a Kevin la URL + secret en cuanto el workflow esté validado (idealmente día 1-2 de la semana 2 para no bloquear a Kevin).

**Semana 3 (May 18-24) — Notifications + WS + push**
- Angie (backend): Web Push end-to-end (VAPID, subscribe, send). WS con JWT-en-query. Topic broadcast handler.
- Angie (frontend): SW minimal (push handler), notification bell + dropdown + página /notificaciones, push subscribe flow, WS client, toast.
- Armando: publish RSVP y event-created, verificar mensajes llegan a Notif MS.

**Semana 4 (May 25-31) — Integración frontend + pendientes Fase I**
- Angie (frontend, **owner exclusivo**): todos los fixes de review (login al inicio, paginación UI consumiendo backend, loading bar, perfil, floor labels, zoom -1, eliminar localStorage temporal, eliminar `ADMIN_EMAILS` y A* cliente, unificar env vars).
- All: mTLS configurado APIM ↔ cada App Service. JWT validation enforced.
- Postman collection finalizada.

**Semana 5 (Jun 1-8) — Hardening + demo + video**
- E2E testing por el plan de verificación.
- Bug fixes, profiling de latencia.
- Grabación de video (Jun 5-6 buffer).
- **Submit Jun 8 07:00 AM**.

---

## 9. Verificación end-to-end

**Test integrado (la demo killer):**
1. Admin login → JWT en localStorage.
2. Admin crea evento → Events publica `event.created` en Service Bus topic.
3. Estudiante (otro browser/incognito) está logueado con WS abierto.
4. Estudiante recibe WS notification + Web Push toast en ≤3s.
5. Estudiante hace click en notificación → routing a `/evento/:id`.
6. Estudiante hace RSVP → Events publica `rsvp.confirmed` en queue.
7. Estudiante recibe notificación personal de confirmación en ≤3s.
8. Lista en `/notifications` muestra ambas (persistidas en Table Storage).

**Smoke por MS:** correr folder Postman correspondiente, todo verde.

**Guion del video (≤5 min):**
- 0:00–0:30 — diagrama de arquitectura.
- 0:30–1:30 — login + JWT en network tab.
- 1:30–2:30 — admin crea evento; mostrar trace APIM + mensaje en Service Bus.
- 2:30–3:30 — estudiante recibe WS + Web Push en vivo.
- 3:30–4:15 — RSVP + lista de notificaciones.
- 4:15–5:00 — Postman corriendo verde + GH Actions verde + 5 storage types en Azure portal.

---

## Archivos críticos a modificar

- `frontend/src/services/eventService.js` — eliminar bloque localStorage temporal
- `frontend/src/services/authService.js` — quitar bypass + admin emails hardcoded
- `frontend/src/services/mapService.js` — quitar A* cliente
- `frontend/src/App.jsx` — login al inicio del flujo
- `frontend/src/components/events/EventsPage.jsx` — paginación UI
- `frontend/src/components/map/MapView.jsx` — minZoom -1
- `frontend/.env.local.example` — unificar env vars
- `docs/documentacion-tecnica.md` — actualizar a Fase II
- `mocks/campus-mock.json`, `mocks/pathways-mock.json` — seed de Map MS Redis

## Pendientes externos

- [x] ~~Map+Notif ambos Python FastAPI~~ — profe confirmó que es OK.
- [x] ~~PWA mobile~~ — profe confirmó que la web actual basta + badge tipo Facebook + sección notificaciones + push.
- [x] ~~WS bypass APIM~~ — descartado, usamos APIM Developer tier con encendido on-demand para mantener "exclusivamente vía APIM".
- [ ] Cada persona crea su propia subscripción Azure for Students y comparte resource group / connection strings necesarios.
- [ ] Documentar el procedimiento de "encender APIM Developer" para que los 3 sepan reactivarlo cuando lo necesiten.
- [ ] Coordinar con Kevin la URL/key de su APIM y App Service.
- [ ] Coordinar con Armando lo mismo.
- [ ] **Angie entrega a Kevin (semana 1-2)**: URL del webhook n8n + shared secret + confirmación de que ya hizo testing de deliverability a TEC. Contrato exacto en sección 3.5 del plan.
- [ ] **Angie crea cuenta Gmail** dedicada `ubicatec.notifs@gmail.com` (o coordina con Kevin/Armando para usar una existente) y genera App Password.
- [ ] **Armando** crea Azure Storage Account + container `event-banners` con acceso público de lectura.
