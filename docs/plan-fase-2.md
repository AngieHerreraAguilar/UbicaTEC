# UbicaTEC — Plan Fase II

## Contexto

Fase II del proyecto IC-6821 (Diseño de Software, valor 35%). **Entrega: 2026-06-08 a las 07:00 — 35 días desde hoy (2026-05-04).**

Pasamos de mocks en Azure API Management (Fase I) a un backend distribuido en microservicios reales sobre Azure App Services. El cuadro azul del diagrama de referencia es lo que construiremos. La Fase I dejó pendientes detectados en review (paginación faltante, JWT validado solo en frontend, latencia de primera carga sin justificar, búsqueda en frontend) que se resuelven naturalmente al mover lógica al backend.

**Resultado esperado al cierre:** 4 microservicios desplegados detrás de APIM con mTLS, web con Web Push y WebSocket en tiempo real, colección Postman ejecutable y video demo de ≤5 min mostrando el flujo end-to-end.

---

## 1. Arquitectura objetivo

```
Web (React+Vite, Service Worker minimal para push)
   │ HTTPS                      │ WSS (a través de APIM Developer tier)
   ▼                            │
Azure API Management (Developer tier, encender on-demand)
   │ mTLS (cert por MS)
   ▼
Auth MS ─────► Azure SQL    Notifications MS ─► Service Bus (queue + topic)
Events MS ───► Cosmos DB                       └► Table Storage
Map MS ──────► Redis Cache                     └► Web Push (VAPID)
```

**Distribución del equipo (4 MS, 3 personas):**
| Componente | Owner | Stack | Almacenamiento |
|---|---|---|---|
| Auth MS | Kevin | Spring Boot 3 + Java 21 (hexagonal **obligatorio**) | Azure SQL Database |
| Events MS | Armando | Node.js 20 + Express + Mongoose | Azure Cosmos DB (Mongo API) |
| Map MS | Angie | Python FastAPI ✓ confirmado por profe | Azure Cache for Redis |
| Notifications MS | Angie | Python FastAPI | Azure Service Bus + Azure Table Storage |
| n8n para email OTP de Auth | **Angie** (apoyo a Kevin) | n8n cloud free o self-host | webhook → SMTP |
| Frontend + Service Worker (push) | **Angie** | React 19 + Vite + SW minimal | — |

> **Carga de Angie:** Map MS + Notifications MS + setup n8n + frontend completo (badge + sección notificaciones + SW para push + todos los pendientes review). Es la persona con más superficie; Kevin (solo Auth, pero hexagonal+mTLS+JWT issuer es complejo) y Armando (Events con paginación server-side y publisher de Service Bus) tienen scope más acotado.

**Tipos de almacenamiento distintos: 5** (SQL, NoSQL document, Cache, Queue/Topic, NoSQL key-value) — supera el mínimo de 3 del rubro.

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

**n8n para email OTP:** webhook desde el adapter. **Setup de n8n: Angie** (acordado con Kevin). Workflow: Webhook trigger → SMTP node (SendGrid free tier o Gmail SMTP con app password). Angie entrega a Kevin la URL del webhook + variables que debe enviar (`{email, code}`). **Fallback obligatorio**: adapter `SmtpFallbackAdapter` en el código de Kevin que envía directo si n8n responde error/timeout — así una caída de n8n no rompe el demo.

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

**Schemas:**
```js
Event { _id, title, description, longDescription, type, date, startHour, endHour,
        buildingId, buildingName, roomId, roomName, organizer, capacity, available,
        price, featured, secure, createdBy, createdAt, updatedAt }
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
- `frontend/src/App.jsx` — login al inicio del flujo: si no autenticado, redirect a `/login` antes de Splash.
- `frontend/src/components/map/MapView.jsx` — `minZoom` -1.
- `frontend/src/services/eventService.js` — eliminar bloque localStorage TEMPORAL (líneas 15-38, lógica en CRUDs); llamar al backend real; eliminar `filterEvents`/`paginateEvents` (mover a server-side).
- `frontend/src/components/events/EventsPage.jsx` — controles de paginación + filtros en URL state.
- `frontend/src/services/mapService.js` — eliminar A* cliente, llamar `/map/route` y `/map/search`.
- Nuevo `LoadingBar` en `AppLayout` ligado a contador global de fetches.
- `FloorSelector` — etiqueta "Piso 1 de 2" en lugar de "1/2".
- Header: integrar icono de perfil → menú con logout, mis eventos, badge de notificaciones.
- `frontend/.env.local.example` — unificar a `VITE_API_GATEWAY_URL`, `VITE_API_KEY`, `VITE_WS_URL`, `VITE_VAPID_PUBLIC_KEY`.
- `frontend/src/services/authService.js` — quitar `IS_LOCAL` bypass, `ADMIN_EMAILS` hardcode, `getRole()` local; rol viene del JWT.

Backend:
- JWT validado server-side en cada MS (middleware).
- Justificación de latencia: documentar cold-start de Spring Boot + APIM (8-15s primera petición). Mitigación: keep-alive cada 4min vía GitHub Action ping.
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
| 1 | Spring Boot cold start 8-15s (causó la latencia de Fase I) | Always-On en B1, o keep-alive ping cada 4min vía GH Action |
| 2 | mTLS no funciona en F1 | Forzar B1+ para todos los MS |
| 3 | iOS Safari y Web Push (ya no aplica como bloqueo: profe dijo que la web sirve como mobile) | Demo principal en Chrome; documentar limitación de iOS Safari sin "Agregar a pantalla de inicio" |
| 4 | Cosmos DB free tier: solo 1 instancia gratis por subscripción Azure | Cada quien tiene su propia subscripción, Armando la usa para Cosmos |
| 5 | n8n SPOF en path crítico de auth | Adapter SMTP fallback en código de Kevin (SendGrid o Gmail SMTP) |
| 6 | Costo Azure | Distribuido en 3 subscripciones Azure for Students ($100 c/u, total $300). APIM Developer (~50/mes) encendido on-demand. Map+Notif comparten App Service Plan B1 dentro de la subscripción de Angie. Apagar Redis y APIM cuando no se está demoeando. |
| 7 | JWKS cache bugs entre 3 stacks | Usar libs probadas (jjwt, jose, python-jose) |
| 8 | `ADMIN_EMAILS` hardcoded en frontend | Eliminar; rol viene del claim del JWT |

---

## 8. Sprint plan (5 semanas)

**Semana 1 (May 4-10) — Scaffolding + infra**
- Angie: resource group, APIM, Service Bus namespace + queue + topic, Table Storage, Redis, App Service plans (Auth solo, Events solo, Map+Notif compartido). Generar certs mTLS.
- Kevin: skeleton Spring Boot hexagonal, Flyway, JWT issuer + JWKS endpoint funcional local.
- Armando: skeleton Express + Mongoose + conexión Cosmos + middleware JWT validator.
- All: crear los 2 repos backend nuevos + CI/CD scaffolding.

**Semana 2 (May 11-17) — Core endpoints**
- Kevin: send-code, verify-code, refresh, me. Integrar webhook n8n (URL provisto por Angie) + SmtpFallbackAdapter. Deploy a App Service.
- Armando: CRUD completo + paginación + filtering server-side. Service Bus publisher.
- Angie: Map MS endpoints + Redis seed. Notifications MS skeleton + Service Bus consumer. **Setup n8n** (workflow Webhook→SMTP) y compartir URL del webhook con Kevin.

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

---

## Pendientes externos

- [x] ~~Map+Notif ambos Python FastAPI~~ — profe confirmó que es OK.
- [x] ~~PWA mobile~~ — profe confirmó que la web actual basta + badge tipo Facebook + sección notificaciones + push.
- [x] ~~WS bypass APIM~~ — descartado, usamos APIM Developer tier con encendido on-demand para mantener "exclusivamente vía APIM".
- [ ] Cada persona crea su propia subscripción Azure for Students y comparte resource group / connection strings necesarios.
- [ ] Documentar el procedimiento de "encender APIM Developer" para que los 3 sepan reactivarlo cuando lo necesiten.
- [ ] Coordinar con Kevin la URL/key de su APIM y App Service.
- [ ] Coordinar con Armando lo mismo.
- [ ] **Angie entrega a Kevin**: URL del webhook n8n + contrato del payload `{email, code}` (semana 1-2).
