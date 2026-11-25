# Blue Bricks Commands

```bash
# Eenmalig lokaal (in een Codespace doet .devcontainer/ dit vanzelf)
docker compose up -d --wait db
cd backend && npm ci && cp .env.example .env && npx prisma generate && npx prisma migrate deploy
cd frontend && npm ci && cp .env.example .env

# Development (twee terminals)
cd backend && npm run dev       # API op 3001; met DEV_LOGIN_ENABLED=true ook de dev-login
cd frontend && npm run dev      # Vite op 5173, proxyt /api naar 3001

# Database (vanuit backend/). NOOIT migrate dev, migrate reset of db push.
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script -o prisma/migrations/<yyyymmddhhmmss>_<naam>/migration.sql
#   de SQL nalezen (alleen de verwachte statements), daarna:
npx prisma migrate deploy       # alleen tegen de lokale Docker-database
npx prisma generate             # client en types verversen
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
#   na een schemawijziging: "No difference detected" = de migratie is compleet (de CI controleert dit ook)
docker compose exec db psql -U app -d app   # lokale database inspecteren

# Checks per pakket (backend/ en frontend/), vóór elke commit. MOETEN slagen.
npm run typecheck
npm run lint
npm run build
npm run test:run
npm run format                  # Prettier

# Security
npm audit
```
