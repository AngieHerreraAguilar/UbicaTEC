# UbicaTEC

Aplicación web para orientación en el campus del TEC: ubicación de aulas en mapa interactivo y consulta de eventos del campus.

**Curso:** IC-6821 Diseño de Software · I Sem 2026
**Fase actual:** Fase I — Frontend funcional con mock services en Azure API Management

## Estructura del repositorio

```
UbicaTEC/
├── frontend/          # Aplicación React (Vite + JS)
├── mocks/             # Definiciones de mock services para Azure API Management
├── docs/              # Diagramas, análisis UX/UI, documentación
└── .github/workflows/ # CI/CD con GitHub Actions (deploy a Azure Static Web Apps)
```

## Stack tecnológico (Fase I)

- **Frontend:** React + Vite (JavaScript)
- **Mocks API:** Azure API Management (Consumption)
- **Hosting:** Azure Static Web Apps
- **CI/CD:** GitHub Actions
- **Auth:** Azure App Service Authentication (Easy Auth)

## Despliegue local

```bash
cd frontend
npm install
npm run dev
```

## Funcionalidades principales

- Login con correo `@estudiantec.cr` + código de verificación
- Mapa interactivo del campus con búsqueda de aulas
- Listado y filtrado de eventos del campus
- Roles: Estudiante / Administrador
- Modo claro/oscuro persistente
- Diseño responsive

## Créditos

Pendiente: librerías y herramientas se documentarán conforme se integren.
