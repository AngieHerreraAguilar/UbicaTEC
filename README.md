# UbicaTEC

Aplicación web para orientación en el campus del TEC: ubicación de aulas en mapa interactivo y consulta de eventos del campus.

**Curso:** IC-6821 Diseño de Software - I Sem 2026
**Fase actual:** Fase I - Frontend funcional con servicios mock en Azure API Management
**Despliegue:** https://witty-moss-0da357a0f.7.azurestaticapps.net

## Equipo

| Persona | Nombre | GitHub | Responsabilidad |
|---------|--------|--------|----------------|
| 1 | Kevin | KARG2606 | Auth Service (Azure API Management) |
| 2 | Angie | AngieHerreraAguilar | Map Service + Frontend + Integración |
| 3 | Armando | Armandohaj | Event Service (Azure API Management) |

## Estructura del repositorio

```
UbicaTEC/
├── frontend/                  # Aplicación React (Vite + JS)
│   ├── src/
│   │   ├── components/        # Componentes UI organizados por feature
│   │   │   ├── auth/          # Login y verificación
│   │   │   ├── events/        # CRUD y listado de eventos
│   │   │   ├── map/           # Mapa interactivo y navegación
│   │   │   └── shared/        # Layout, nav, header, iconos
│   │   ├── services/          # Clientes API (auth, events, map)
│   │   ├── hooks/             # Custom hooks (useAuth)
│   │   ├── data/              # Datos estáticos (rutas SVG)
│   │   ├── styles/            # Tema y variables CSS
│   │   └── assets/            # SVGs e imágenes
│   ├── .env.local             # Variables de entorno (desarrollo)
│   └── .env.production        # Variables de entorno (producción)
├── mocks/                     # JSONs de referencia para mock services
├── docs/                      # Documentación técnica
└── .github/workflows/         # CI/CD con GitHub Actions
```

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 8 (JavaScript) |
| Estilos | CSS custom con design tokens (sin framework) |
| Mapa | Leaflet + react-leaflet |
| Tipografía | Inter (body) + Manrope (headings) via @fontsource |
| Iconos | Flaticon Uicons (CDN) + SVGs custom |
| API Gateway | Azure API Management (Consumption tier) |
| Mock Services | Azure API Management (mock-response policies) |
| Hosting | Azure Static Web Apps (Free tier) |
| CI/CD | GitHub Actions (deploy automático en push a main) |

## Funcionalidades

- Login con correo `@estudiantec.cr` / `@itcr.ac.cr` + código de verificación
- Mapa interactivo del campus con búsqueda de aulas y edificios
- Navegación con pathfinding (A*) entre edificios
- Selector de pisos (planta 1 / planta 2)
- Listado, filtrado y búsqueda de eventos del campus
- Detalle de evento con inscripción (RSVP)
- Creación de eventos (rol admin)
- Carrusel de eventos destacados
- Modo claro/oscuro persistente
- Diseño responsive (mobile-first + desktop sidebar)

## Despliegue local

```bash
cd frontend
npm install
npm run dev
```

Variables de entorno necesarias en `frontend/.env.local`:
```
VITE_API_GATEWAY_URL=https://ubicatec-gateway.azure-api.net
VITE_API_KEY=<subscription-key>
```
