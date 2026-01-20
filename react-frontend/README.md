# React Frontend (Work in progress)

This folder contains a React SPA that will replace the current Vaadin (Java) UI.

Development
- Start backend: `mvn spring-boot:run`
- Start React dev server (from this folder): `npm install && npm run dev`
- Open: `http://localhost:5173/react/`

Notes
- Authentication uses the existing Spring Security session (`POST /login`), and API calls are made to `/api/**` through the Vite proxy.
- Backend defaults to `http://localhost:11002` (override with `VITE_BACKEND_URL` when running `npm run dev`).
