# UbicaTEC - Documentacion Tecnica Fase I

**Curso:** IC-6821 Diseno de Software - I Semestre 2026
**Fecha:** Abril 2026

---

## INDICE

1. [Arquitectura General](#1-arquitectura-general)
2. [API Gateway (ubicatec-gateway)](#2-api-gateway-ubicatec-gateway)
3. [Map Service (Persona 2 - Angie)](#3-map-service-persona-2---angie)
4. [Auth Service (Persona 1 - Kevin)](#4-auth-service-persona-1---kevin)
5. [Event Service (Persona 3 - Armando)](#5-event-service-persona-3---armando)
6. [Frontend](#6-frontend)
7. [CI/CD y Despliegue](#7-cicd-y-despliegue)
8. [Capturas Requeridas](#8-capturas-requeridas)

---

## 1. Arquitectura General

### 1.1 Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENTE (Browser)                     │
│               React + Vite (SPA)                        │
│        https://witty-moss-0da357a0f.7.azurestaticapps.net│
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────┐
│              ubicatec-gateway                            │
│         Azure API Management (Consumption)               │
│      https://ubicatec-gateway.azure-api.net              │
│                                                          │
│   ┌──────────┐   ┌──────────┐   ┌──────────┐           │
│   │ /auth/*  │   │/events/* │   │  /map/*  │           │
│   └────┬─────┘   └────┬─────┘   └────┬─────┘           │
└────────┼──────────────┼──────────────┼──────────────────┘
         │              │              │
         ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌──────────────┐
   │Auth Svc  │  │Event Svc │  │  Map Svc     │
   │(Kevin)   │  │(Armando) │  │  (Angie)     │
   │Mock APIM │  │Mock APIM │  │  Mock APIM   │
   └──────────┘  └──────────┘  └──────────────┘
```

### 1.2 Flujo de una peticion

1. El frontend hace `fetch()` a `ubicatec-gateway.azure-api.net/<servicio>/<operacion>`
2. Incluye header `Ocp-Apim-Subscription-Key` con la key del gateway
3. El gateway rutea al backend correspondiente (Auth, Events o Map)
4. El gateway inyecta la subscription key del servicio destino via policy `set-header`
5. El servicio destino devuelve la respuesta mock
6. El gateway retorna la respuesta al frontend

### 1.3 Recursos Azure

| Recurso | Tipo | URL |
|---------|------|-----|
| Frontend | Azure Static Web Apps | https://witty-moss-0da357a0f.7.azurestaticapps.net |
| API Gateway | Azure API Management | https://ubicatec-gateway.azure-api.net |
| Map Service | Azure API Management | https://angie-map-service.azure-api.net |
| Auth Service | Azure API Management | (documentar URL - Kevin) |
| Event Service | Azure API Management | (documentar URL - Armando) |

---

## 2. API Gateway (ubicatec-gateway)

### 2.1 Proposito

Punto de entrada unico para el frontend. Rutea peticiones a los tres microservicios y maneja:
- Autenticacion via subscription key
- CORS para el dominio del frontend
- Inyeccion de keys hacia los servicios backend

### 2.2 APIs registradas

| API | Sufijo URL | Backend |
|-----|-----------|---------|
| Auth Service | `/auth` | API Management de Kevin |
| Event Service | `/events` | API Management de Armando |
| Map Service | `/map` | API Management de Angie |

### 2.3 Subscription

| Nombre | Scope | Primary Key |
|--------|-------|------------|
| Built-in all-access subscription | Service (todas las APIs) | `77076f8b89cd400488ba24690e7f900c` |

### 2.4 Policy comun (inbound - All operations)

Cada API tiene en su inbound policy:

```xml
<set-header name="Ocp-Apim-Subscription-Key" exists-action="override">
    <value>{subscription-key-del-servicio-destino}</value>
</set-header>
```

Esto reemplaza la key del gateway por la key del microservicio antes de reenviar.

---

## 3. Map Service (Persona 2 - Angie)

### 3.1 Informacion del servicio

| Campo | Valor |
|-------|-------|
| API Management | `angie-map-service` |
| URL Gateway | https://angie-map-service.azure-api.net |
| Subscription Key | `5a59c77e3a9844838dbc99b0c29df72e` |
| URL via gateway central | https://ubicatec-gateway.azure-api.net/map |

### 3.2 Operaciones

#### GET /map/campus

Devuelve la configuracion del campus, edificios y aulas.

**Response 200:**

```json
{
  "campus": {
    "name": "TEC Sede Regional San Carlos",
    "city": "Santa Clara, San Carlos, Alajuela",
    "mapImage": "campus-map.svg",
    "imageSize": [3033, 3492],
    "initialCenter": [1285, 1875],
    "initialZoom": -2,
    "minZoom": -3,
    "maxZoom": 2
  },
  "buildings": [
    {
      "id": "CE",
      "name": "Edificio Ciencias Exactas",
      "description": "Aulas y laboratorios de ciencias",
      "frame": { "x": 980, "y": 1419, "w": 610, "h": 911.5 },
      "bounds": [[980, 1419], [1590, 2330.5]],
      "rooms": [
        {
          "id": "CE-A1",
          "name": "A - 1",
          "floor": 1,
          "type": "aula",
          "capacity": 30,
          "bounds": [[1437, 1680], [1552, 1752]]
        }
      ]
    }
  ]
}
```

**Campos principales de `campus`:**

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| name | string | Nombre de la sede |
| imageSize | [int, int] | Dimensiones del SVG del mapa en pixeles |
| initialCenter | [int, int] | Centro inicial del viewport |
| initialZoom / minZoom / maxZoom | int | Niveles de zoom para Leaflet |

**Campos de cada `building`:**

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | string | Identificador unico (ej: "CE", "CO") |
| name | string | Nombre del edificio |
| frame | object | Posicion y dimensiones en el SVG |
| bounds | [[x1,y1],[x2,y2]] | Rectangulo delimitador en coordenadas SVG |
| rooms | array | Lista de aulas/laboratorios |

**Campos de cada `room`:**

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | string | Identificador unico (ej: "CE-A1") |
| name | string | Nombre del aula |
| floor | int | Planta (1 o 2) |
| type | string | Tipo: aula, laboratorio, oficina, servicio, bodega |
| capacity | int | Capacidad de personas |
| bounds | [[x1,y1],[x2,y2]] | Rectangulo en coordenadas SVG |

#### GET /map/pathways

Devuelve el grafo de navegacion para pathfinding entre edificios.

**Response 200:**

```json
{
  "defaultStart": "GATE",
  "waypoints": {
    "GATE": [2630, 2400],
    "RE1": [2630, 2200],
    "CCN": [1590, 1420]
  },
  "edges": [
    ["GATE", "RE1"],
    ["RE1", "RE2"]
  ],
  "buildingConnections": {
    "CE": "CCN",
    "CO": "ACO3",
    "AD": "CAN"
  }
}
```

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| defaultStart | string | Waypoint de inicio por defecto (entrada principal) |
| waypoints | object | Mapa de ID a coordenadas [x, y] en el SVG |
| edges | array | Pares de waypoints conectados (grafo no dirigido) |
| buildingConnections | object | Mapa de buildingId al waypoint mas cercano |

### 3.3 Algoritmo de pathfinding

El frontend implementa A* (A-star) sobre el grafo de waypoints:

1. El usuario selecciona un edificio destino
2. Se obtiene el waypoint mas cercano al edificio via `buildingConnections`
3. Se ejecuta A* con heuristica euclidiana desde el punto de inicio (GATE o ubicacion del usuario) hasta el waypoint destino
4. El resultado es un array de coordenadas [x, y] que se dibuja como polyline sobre el mapa

### 3.4 Mock policy (en angie-map-service)

```xml
<policies>
    <inbound>
        <base />
        <mock-response status-code="200" content-type="application/json" />
    </inbound>
    <backend>
        <base />
    </backend>
    <outbound>
        <base />
    </outbound>
    <on-error>
        <base />
    </on-error>
</policies>
```

Los datos mock se configuran en el **Sample** de la respuesta 200 de cada operacion (Frontend > Responses > 200 > Sample).

---

## 4. Auth Service (Persona 1 - Kevin)

> **Nota para Kevin:** Completar esta seccion con los detalles de tu servicio.

### 4.1 Informacion del servicio

| Campo | Valor |
|-------|-------|
| API Management | (nombre del recurso) |
| URL Gateway | (URL) |
| Subscription Key | (key) |
| URL via gateway central | https://ubicatec-gateway.azure-api.net/auth |

### 4.2 Operaciones

#### POST /auth/send-code

Envia un codigo de verificacion al correo institucional.

**Request body:**
```json
{ "email": "usuario@estudiantec.cr" }
```

**Response 200:**
```json
{ "success": true, "message": "Codigo enviado" }
```

#### POST /auth/verify-code

Verifica el codigo ingresado y devuelve token de sesion.

**Request body:**
```json
{ "email": "usuario@estudiantec.cr", "code": "123456" }
```

**Response 200:**
```json
{
  "success": true,
  "token": "mock-jwt-token",
  "user": { "email": "usuario@estudiantec.cr", "role": "estudiante" }
}
```

### 4.3 Reglas de negocio (implementadas en frontend Fase I)

- Solo se permiten correos `@estudiantec.cr` y `@itcr.ac.cr`
- Emails en lista `ADMIN_EMAILS` reciben rol `admin`; el resto recibe `estudiante`
- El token, email y rol se persisten en `localStorage`

---

## 5. Event Service (Persona 3 - Armando)

> **Nota para Armando:** Completar esta seccion con los detalles de tu servicio.

### 5.1 Informacion del servicio

| Campo | Valor |
|-------|-------|
| API Management | `armando-api-managementservice` |
| URL Gateway | (URL) |
| Subscription Key | (key) |
| URL via gateway central | https://ubicatec-gateway.azure-api.net/events |

### 5.2 Operaciones

#### GET /events/

Lista todos los eventos.

**Response 200:** Array de objetos evento.

**Campos de evento:**

| Campo | Tipo | Descripcion |
|-------|------|-------------|
| id | int | Identificador unico |
| title | string | Titulo del evento |
| description | string | Descripcion corta |
| longDescription | string | Descripcion extendida (opcional) |
| date | string | Fecha (YYYY-MM-DD) |
| startHour | string | Hora inicio (HH:mm) |
| endHour | string | Hora fin (HH:mm) |
| type | string | charla, taller, asamblea, competencia, feria, especial |
| badge | string | Etiqueta visual |
| buildingId | string | ID del edificio (referencia a Map Service) |
| buildingName | string | Nombre del edificio |
| roomId | string | ID del aula |
| roomName | string | Nombre del aula |
| organizer | string | Organizador |
| capacity | int | Capacidad total (0 = ilimitada) |
| available | int | Cupos disponibles |
| price | string | "FREE" o monto |
| featured | boolean | Si aparece en el carrusel destacado |
| secure | boolean | Si requiere validacion de ID |
| createdBy | string | Email del creador |

#### POST /events/

Crea un nuevo evento.

#### PUT /events/{id}

Actualiza un evento existente.

#### DELETE /events/{id}

Elimina un evento.

### 5.3 Nota sobre mock

El endpoint `GET /events/{id}` del mock siempre devuelve el mismo evento. El frontend resuelve esto buscando por ID en la lista completa de `GET /events/`.

Los campos `time`/`endTime` fueron renombrados a `startHour`/`endHour` porque Azure APIM interpreta campos llamados "time" como datetime y los reemplaza con `@(utcnow())`.

---

## 6. Frontend

### 6.1 Estructura de componentes

```
src/
├── components/
│   ├── auth/
│   │   └── LoginPage.jsx          # Login + verificacion de codigo
│   ├── events/
│   │   ├── EventsPage.jsx         # Listado con busqueda y filtrado
│   │   ├── EventCard.jsx          # Tarjeta con swipe-to-delete
│   │   ├── EventDetailPage.jsx    # Detalle completo + RSVP
│   │   ├── CreateEventPage.jsx    # Formulario de creacion (admin)
│   │   ├── FeaturedCarousel.jsx   # Carrusel draggable + flechas desktop
│   │   ├── FeaturedEventCard.jsx  # Tarjeta de evento destacado
│   │   ├── DatePicker.jsx         # Selector de fecha custom
│   │   └── TimePicker.jsx         # Selector de hora custom
│   ├── map/
│   │   ├── MapPage.jsx            # Pagina principal del mapa
│   │   ├── MapView.jsx            # Componente Leaflet con overlays SVG
│   │   ├── FloorSelector.jsx      # Selector de planta (1/2)
│   │   ├── DestinationCard.jsx    # Tarjeta de destino seleccionado
│   │   └── RouteLine.jsx          # Polyline de ruta sobre el mapa
│   └── shared/
│       ├── AppLayout.jsx          # Layout con nav + header
│       ├── BottomNav.jsx          # Nav inferior (mobile) / sidebar (desktop)
│       ├── Header.jsx             # Barra de busqueda con autocomplete
│       ├── Icons.jsx              # Wrappers de iconos Flaticon
│       ├── ProtectedRoute.jsx     # Guard de rutas autenticadas
│       ├── Splash.jsx             # Pantalla de carga inicial
│       └── ThemeToggle.jsx        # Toggle claro/oscuro
├── services/
│   ├── authService.js             # Cliente API autenticacion
│   ├── eventService.js            # Cliente API eventos
│   ├── mapService.js              # Cliente API mapa
│   ├── roleService.js             # Determinacion de roles
│   └── routeGraph.js              # Motor de pathfinding (A*)
├── hooks/
│   └── useAuth.js                 # Hook de estado de autenticacion
├── styles/
│   ├── theme.css                  # Design tokens (colores, tipografia, spacing)
│   └── global.css                 # Reset, utilidades, badges
└── assets/
    ├── campus-map.svg             # Mapa completo planta 1
    ├── campus-map2.svg            # Mapa completo planta 2
    ├── MapWatermarkBG.svg         # Fondo decorativo del splash
    └── marker-pin.svg             # Pin de ubicacion
```

### 6.2 Rutas (React Router)

| Ruta | Componente | Acceso |
|------|-----------|--------|
| `/` | Splash | Publico |
| `/mapa` | MapPage | Publico |
| `/eventos` | EventsPage | Publico |
| `/evento/:id` | EventDetailPage | Publico |
| `/crear-evento` | CreateEventPage | Solo admin |
| `/login` | LoginPage | Publico |

### 6.3 Services (clientes API)

#### mapService.js
- `initMapData()` - Carga inicial de datos del mapa desde la API
- `getCampus()` - Config del campus
- `getBuildings()` - Lista de edificios
- `getRoomById(id)` - Busca aula por ID
- `searchAll(query)` - Busqueda fuzzy de aulas y edificios
- `findRouteToRoom(buildingId)` - Ruta desde entrada hasta edificio
- `findRouteFromPoint(point, buildingId)` - Ruta desde punto arbitrario

#### eventService.js
- `getEvents()` - Lista todos los eventos (mock + localStorage)
- `getEventById(id)` - Busca evento por ID en la lista completa
- `createEvent(data)` - Crea evento (persiste en localStorage)
- `updateEvent(id, data)` - Actualiza evento
- `deleteEvent(id)` - Elimina evento
- `joinEvent(id)` - Inscribe al usuario (persiste cupos en localStorage)

#### authService.js
- `sendVerificationCode(email)` - Envia codigo via API
- `verifyCode(email, code)` - Verifica y guarda sesion
- `getCurrentUser()` - Retorna usuario actual desde localStorage
- `logout()` - Limpia sesion

### 6.4 Design System

**Tema:** CSS custom properties en `theme.css` con soporte dark mode via `[data-theme='dark']`.

**Colores principales:**

| Token | Claro | Oscuro | Uso |
|-------|-------|--------|-----|
| --bg-primary | #ffffff | #0f1a33 | Fondo principal |
| --bg-secondary | #f8f9fa | #16213e | Fondo secundario |
| --bg-elevated | #ffffff | #1c2a4e | Cards, dropdowns |
| --text-primary | #16213e | #e9ecef | Texto principal |
| --color-accent | #e94560 | #e94560 | CTAs, enlaces |
| --color-brand-dark | #16213e | #16213e | Marca |

**Tipografia:**
- Headings: Manrope (700, 800)
- Body: Inter (200, 400, 600)

**Breakpoints:**
- Mobile: < 768px (bottom nav flotante)
- Tablet: 768px - 1023px (frame centrado 420px)
- Desktop: >= 1024px (sidebar lateral 240px)

### 6.5 Micro-interacciones

#### Swipe-to-delete (EventCard)

Permite al organizador eliminar sus propios eventos sin navegar a otra pantalla.

- **Condicion:** solo se habilita si `event.createdBy === usuario logueado`
- **Mobile:** deslizar a la izquierda revela un boton rojo con icono de basura (80px)
- **Desktop:** click + arrastrar a la izquierda (mismos mouse handlers)
- **Confirmacion:** al tocar el boton aparece un overlay con "¿Eliminar este evento?" y botones Cancelar / Eliminar
- **Prevencion de navegacion:** si hubo movimiento de drag, el click no navega al detalle del evento
- **Threshold:** 72px de desplazamiento para activar el snap al boton; menor regresa a posicion original

#### Carrusel de eventos destacados (FeaturedCarousel)

Navegacion fluida entre tarjetas de eventos destacados.

- **Drag nativo:** basado en `transform: translateX()` con seguimiento 1:1 del puntero
- **Velocity detection:** un flick rapido (>0.3 px/ms) avanza al siguiente slide aunque el desplazamiento sea menor al 25%
- **Rubber-band:** en los bordes el arrastre se atenua (factor 0.3) simulando elasticidad
- **Easing:** `cubic-bezier(.25,.1,.25,1)` para el snap animado al soltar
- **Desktop:** flechas prev/next (visibles solo en ≥1024px) + drag con mouse
- **Mobile:** touch nativo + dots indicadores
- **Prevencion de navegacion:** drag >4px bloquea el click en los links internos

### 6.6 Persistencia local (Fase I)

En Fase I, sin backend real, se usa `localStorage` para:

| Key | Proposito |
|-----|-----------|
| `theme` | Preferencia claro/oscuro |
| `auth_token` | Token de sesion mock |
| `user_email` | Email del usuario logueado |
| `user_role` | Rol (estudiante/admin) |
| `ubicatec:local-events` | Eventos creados localmente |
| `ubicatec:deleted-events` | IDs de eventos eliminados |
| `ubicatec:joined-events` | IDs de eventos inscritos |
| `ubicatec:available-overrides` | Decrementos de cupos |
| `ubicatec:event-draft` | Borrador de evento en progreso |

---

## 7. CI/CD y Despliegue

### 7.1 Pipeline

```
Push a main → GitHub Actions → Build (Vite) → Deploy a Azure Static Web Apps
```

**Workflow:** `.github/workflows/azure-static-web-apps-witty-moss-0da357a0f.yml`

- **Trigger:** Push a `main` o PR abierto/sincronizado
- **Build:** `npm install && npm run build` en `./frontend`
- **Output:** `dist/`
- **Deploy:** Azure Static Web Apps via token secreto

### 7.2 Variables de entorno (produccion)

Configuradas en `frontend/.env.production`:

```
VITE_API_GATEWAY_URL=https://ubicatec-gateway.azure-api.net
VITE_API_KEY=77076f8b89cd400488ba24690e7f900c
```

Se embeben en el build de Vite (reemplazo en tiempo de compilacion).

---

## 8. Capturas Requeridas

### Para el documento tecnico, tomar capturas de:

#### Azure Portal - API Gateway (ubicatec-gateway)
- [ ] Overview del recurso (URL, tier, region)
- [ ] APIs registradas (lista con Auth, Events, Map)
- [ ] Subscriptions (mostrando la key all-access)
- [ ] Policy de inbound de Map Service (mostrando set-header)
- [ ] Test tab con response 200 de cada operacion

#### Azure Portal - Map Service (angie-map-service)
- [ ] Overview del recurso
- [ ] APIs > Map API con las 2 operaciones (Get Campus, Get Pathways)
- [ ] Frontend > Responses > 200 de Get Campus (mostrando el sample)
- [ ] Frontend > Responses > 200 de Get Pathways
- [ ] Inbound policy (mock-response)
- [ ] Test tab con response 200

#### Azure Portal - Static Web App
- [ ] Overview (URL, deployment status)
- [ ] GitHub integration (repo y branch)

#### GitHub
- [ ] Repositorio principal (estructura de archivos)
- [ ] Actions tab (ultimo deploy exitoso)
- [ ] Workflow run detail (pasos build y deploy)

#### Postman
- [ ] Coleccion con las requests de Map API
- [ ] Response de GET /map/campus (200 con JSON)
- [ ] Response de GET /map/pathways (200 con JSON)
- [ ] Tests pasando (verde)

#### App desplegada
- [ ] Splash screen
- [ ] Mapa interactivo (light mode)
- [ ] Mapa interactivo (dark mode)
- [ ] Busqueda de aula con resultado
- [ ] Tarjeta de destino con boton "Explorar ruta"
- [ ] Ruta dibujada en el mapa
- [ ] Selector de pisos
- [ ] Lista de eventos
- [ ] Detalle de evento
- [ ] Formulario de crear evento
- [ ] Login (paso email)
- [ ] Login (paso codigo)
- [ ] Login exitoso
- [ ] Vista desktop (sidebar)
- [ ] Swipe-to-delete en evento propio (boton rojo revelado)
- [ ] Confirmacion de eliminacion (overlay)
- [ ] Carrusel desktop con flechas de navegacion

---

> **Instrucciones para companeros:**
> - Kevin: completar seccion 4 con los datos de Auth Service
> - Armando: completar seccion 5 con los datos de Event Service
> - Cada uno debe tomar las capturas correspondientes a su servicio en Azure Portal y Postman
