# Blue Bricks App Template

Het standaard-template voor Blue Bricks-webapplicaties, gebouwd voor ontwikkelen met Claude Code. Je start met een werkend skelet zonder domein: een inlogscherm (Microsoft, of lokaal met één klik), een startpagina en een 404-pagina in de app-shell met menu, een API met `/health` en `/api/auth/me`, en groene checks en CI.

## Stack

React 19, Vite, React Router en TanStack Query in `frontend/`; Express 5, Prisma 7 en PostgreSQL 17 in `backend/`; Supabase Auth met Microsoft; DigitalOcean App Platform. De UI komt uit de [Blue Bricks UI-bibliotheek](https://github.com/Nieradj-BB/BiBi-Reusable-Components). Zie [CLAUDE.md](CLAUDE.md) voor de volledige stack en de regels.

## UI-bibliotheek

De frontend staat op tag `v0.2.2` van de bibliotheek, met `theme`, `utils`, `button`, `card`, `alert`, `app-shell`, `page-header`, `page-content` en `empty-state`. Het inlogscherm staat buiten de shell; elke andere pagina erin, volgens het patroon van de startpagina. Meer componenten voeg je toe vanuit `frontend/`, op dezelfde tag:

```bash
npx shadcn@4.23.0 add Nieradj-BB/BiBi-Reusable-Components/dialog#v0.2.2
```

Componenten komen in `src/components/ui/`, het thema in `src/styles/globals.css`. Die bestanden pas je niet zelf aan en Prettier slaat ze over, zodat een update naar een nieuwe tag alleen echte wijzigingen laat zien. Lint blokkeert alles wat het vaste thema breekt (paletkleuren, losse kleurwaarden, `dark:`, andere radii en schaduwen). Zie [.claude/rules/ui.md](.claude/rules/ui.md).

## Een nieuwe app

1. Klik op **Use this template** en kies een naam voor de repository.
2. Zet de naam van de app op deze plekken:
   - `backend/src/config/app.ts`: `APP_NAME` (de volledige naam, bijvoorbeeld "Blue Bricks Projecten") en `APP_SLUG`
   - `frontend/src/config/app.ts`: `APP_NAME`, alleen de productnaam ("Projecten"): de shell en het inlogscherm zetten er "Blue Bricks" voor
   - `frontend/index.html`: `<title>`
   - `CLAUDE.md`: titel en de twee zinnen eronder
3. Vul `spec.md`, `GLOSSARY.md` en `docs/plan.md`.
4. Start een Codespace, of werk lokaal (zie hieronder).

## Lokaal of in een Codespace

**Codespace:** alles gaat vanzelf. Na het openen staan de dependencies, de `.env`-bestanden (met de dev-login aan) en de database klaar.

**Lokaal** (Node 22, Docker):

```bash
docker compose up -d --wait db
cd backend && npm ci && cp .env.example .env && npx prisma generate && npx prisma migrate deploy
cd ../frontend && npm ci && cp .env.example .env
```

Zet voor de dev-login in `backend/.env` `DEV_LOGIN_ENABLED=true` en een `DEV_LOGIN_SECRET` van minstens 32 tekens, en in `frontend/.env` `VITE_DEV_LOGIN_ENABLED=true`. Start daarna `npm run dev` in `backend/` en in `frontend/`, en open http://localhost:5173.

Met npm 11 kan `npm ci` de install-scripts van Prisma en esbuild blokkeren. De toegestane scripts staan onder `allowScripts` in `package.json`; keur ze zo nodig goed met `npm install-scripts approve <pakket>`.

## Inloggen met Microsoft (Supabase)

1. Maak een Supabase-project aan en zet de JWT-sleutel op ECC (P-256).
2. Zet de Azure-provider aan met de eigen tenant (nooit `common`), en voeg `<frontend-url>/login` toe als redirect-URL.
3. Vul `SUPABASE_URL` in `backend/.env`, en `VITE_SUPABASE_URL` en `VITE_SUPABASE_PUBLISHABLE_KEY` in `frontend/.env`. Er is geen geheime sleutel nodig.

Wie voor het eerst met Microsoft inlogt, krijgt vanzelf een account met de rol `user`. Een beheerder krijgt de rol `admin` in de tabel `users`.

## Deploy

Zie [docs/ci-cd.md](docs/ci-cd.md): CI, de smoke test, DigitalOcean App Platform en branch protection.

## Documentatie

| Bestand                          | Inhoud                                     |
| -------------------------------- | ------------------------------------------ |
| [CLAUDE.md](CLAUDE.md)           | Stack, strikte regels, werkwijze voor Claude |
| [WORKFLOW.md](WORKFLOW.md)       | Ontwikkelproces met Claude Code            |
| [spec.md](spec.md)               | Functionele specificatie (format)          |
| [GLOSSARY.md](GLOSSARY.md)       | Begrippen (format)                         |
| [docs/plan.md](docs/plan.md)     | Stappen en log (format)                    |
| [docs/adr/](docs/adr/)           | Architectuurbesluiten (format)             |
| [docs/ci-cd.md](docs/ci-cd.md)   | CI/CD en deploy                            |

## Claude Code-configuratie

- `.claude/settings.json`: permissions en hooks (commit-guard, Prettier per pakket), voor zowel de Bash- als de PowerShell-tool (Windows)
- `.claude/rules/`: conventies, commands, workflow en MCP, automatisch geladen
- `.claude/commands/`: `/commit`, `/pr`, `/catchup`, `/fix`
- `.claude/agents/`: code-reviewer, security-auditor, test-writer, debugger, docs-writer
- `.claude/skills/`: Prisma CLI en client, TanStack Query, Vitest, security-review, error boundaries
- `.claude/launch.json`: preview van frontend en backend
- `.mcp.json`: Supabase, read-only
