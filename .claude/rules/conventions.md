# Blue Bricks Conventies

## API

- Routes: `GET|POST|PUT|PATCH|DELETE /api/<resource>/:id`, één router per resource in `backend/src/routes/<resource>.ts`, gemount in `app.ts`
- Succes: `res.json({ data })`
- Fout: gooi `new ApiError(status, "SCREAMING_SNAKE", "Nederlandse melding")` en laat `errorHandler` het antwoord `{ error: { code, message } }` maken. Een `ZodError` wordt vanzelf 400.
- Statuscodes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict, 429 Rate Limit, 500 Server Error
- Validatie: Zod op elke input (body, params, query); types afleiden met `z.infer<typeof schema>`
- Auth: `app.ts` zet `requireAuth` op heel `/api` (behalve `/api/auth`), dus een nieuwe router is vanzelf dicht. Mount routers onder die regel en zet `requireAuth` niet nog eens op de route; voor beheer `requireRole(ROLE_ADMIN)`. Een openbare route komt alleen boven de poort, na overleg met de developer.
- Dure endpoints krijgen een eigen rate limiter (per `req.user.id`) naast `defaultRateLimit`

## Frontend

- Naar de backend alleen via `api` uit `@/services/api` (axios met token en refresh), nooit losse `fetch` of `axios`
- Server state met TanStack Query: queries en mutations in hooks (`hooks/use<Resource>.ts`), de sessie in `AuthContext`
- Pagina's achter `ProtectedRoute`; alleen-beheer achter `RoleRoute`. Dat bepaalt alleen wat je ziet: de backend controleert zelf.
- UI-componenten komen uit de Blue Bricks UI-bibliotheek (`components/ui/`, niet handmatig aanpassen). Geen eigen kleuren, fonts of schaduwen. Zie `ui.md`.

## Mapstructuur

- Backend `backend/src/`: `config/`, `middleware/`, `routes/<resource>.ts`, `services/<domein>/`, `utils/`, `test/` (testhelpers). `backend/dev/` alleen voor de lokale dev-server.
- Frontend `frontend/src/`: `pages/`, `components/<feature>/`, `components/layout/`, `hooks/`, `services/`, `context/`, `types/`, `utils/`, `config/`, `styles/globals.css` (het enige CSS-bestand)
- Tests naast de code: `*.test.ts(x)`, niet in `__tests__/`

## Code style

- Engelse namen in code (variabelen, functies, types, bestanden); Nederlandse tekst voor gebruikers (UI en foutmeldingen van de API)
- Importvolgorde: 1) React/extern 2) intern via `@/` 3) types 4) relatief
- Named exports voor componenten, default export alleen voor pages
- Props-interface direct boven de component
- Functionele componenten

## Auth

- Supabase Auth alleen voor inloggen met Microsoft; alle data staat in de eigen Postgres via Prisma
- Frontend: Supabase-client in `services/supabase.ts` (`null` zonder project); `services/api.ts` stuurt het token mee als `Authorization: Bearer`
- Backend: tokens tegen de JWKS van het Supabase-project (`SUPABASE_URL`, ES256); geen JWT-secret of service-role-key
- Rollen en `active` per verzoek uit de tabel `users`. Nieuwe rollen in `backend/src/services/auth/roles.ts` én `frontend/src/types/user.ts`.
- Dev-login alleen in `backend/dev/` en achter `import.meta.env.DEV` plus de mode; de CI controleert beide builds

## Database

- Prisma only: geen `$queryRaw` of `$executeRaw`
- Prisma 7: de URL staat in `prisma.config.ts`, de verbinding loopt via `@prisma/adapter-pg`
- `prisma` en `@prisma/client` altijd op dezelfde exacte versie; na een install beide controleren (npm kan een pre-release grijpen)
- Na een schemawijziging eerst `npx prisma generate`, dan de typecheck
- Migraties: zie `commands.md`

## Environment variables

- Per pakket een `.env.example`. Een nieuwe variabele komt ook in `.env.example` en in `config/env.ts` (backend) of `vite-env.d.ts` (frontend).
- Frontend-variabelen beginnen met `VITE_` en zijn openbaar: nooit een geheim
- Boolean-variabelen: alleen de tekst `"true"` is waar (`booleanEnv`), nooit `z.coerce.boolean()`
- Een variabele die een beveiliging uitzet, faalt hard in productie in plaats van te waarschuwen
