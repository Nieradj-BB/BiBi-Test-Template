# CI/CD

## Workflows

| Workflow          | Trigger                                    | Bestand                                   |
| ----------------- | ------------------------------------------ | ----------------------------------------- |
| CI                | PR naar en push op `develop` en `main`     | `.github/workflows/ci.yml`                |
| Deploy Staging    | Na groene CI van een push op `develop`     | `.github/workflows/deploy-staging.yml`    |
| Deploy Production | Na groene CI van een push op `main`        | `.github/workflows/deploy-production.yml` |

`develop` is staging, `main` is productie. Er is geen aparte `staging`-branch.

## CI

1. **Supply Chain Security**: zoekt bekende gecompromitteerde versies in beide lockfiles.
2. **Backend Checks** en **Frontend Checks** (parallel): `npm ci`, `npm audit` (waarschuwing), typecheck, lint, build, tests. De backend genereert eerst de Prisma-client.
3. **Geen dev-login in de build**: grep op `dist/` van backend en frontend. De frontend bouwt hierbij met `VITE_DEV_LOGIN_ENABLED=true`, zoals in een Codespace.
4. **Smoke Test** (na de backend): een echte Postgres, `prisma migrate deploy`, en daarna `prisma migrate diff --exit-code`: de database na alle migraties moet precies `schema.prisma` zijn. Zo valt een schemawijziging zonder migratie op, wat typecheck en tests (Prisma gemockt) niet zien. Dan de dev-backend starten, inloggen met de dev-login en `GET /api/auth/me`. Daarna twee negatieve controles: de dev-server weigert `NODE_ENV=production`, en de gebouwde backend geeft 404 op de dev-login-routes.

Breid de smoke test uit met een aanroep per belangrijke route zodra de app die heeft.

## Deploy (DigitalOcean App Platform)

De deploy-workflows starten alleen een deploy (`doctl apps create-deployment`). DigitalOcean bouwt zelf de branch uit de app-spec. Zolang de variable `DO_CONFIGURED_<OMGEVING>` niet op `true` staat, slaan ze de deploy over met een melding.

### Eenmalig per app

1. Kopieer `.do/app.example.yaml` naar `.do/app-staging.yaml` en `.do/app-production.yaml`, vul de plaatshouders in en maak de apps aan met `doctl apps create --spec …`.
2. Maak in GitHub de environments `staging` en `production` aan. Zet bij `production` "Required reviewers" aan.
3. Zet per environment:

| Soort    | Naam                                                  | Waarde                                |
| -------- | ----------------------------------------------------- | ------------------------------------- |
| Secret   | `DO_ACCESS_TOKEN`                                     | DigitalOcean API-token, scope `apps`  |
| Secret   | `DO_APP_ID_STAGING` of `DO_APP_ID_PRODUCTION`         | Het app-id uit `doctl apps list`      |
| Variable | `DO_CONFIGURED_STAGING` of `DO_CONFIGURED_PRODUCTION` | `true`                                |

4. Controleer na de eerste deploy de rate limiter. Op App Platform staat in `X-Forwarded-For` het adres van DigitalOcean zelf, voor iedereen hetzelfde; het adres van de gebruiker staat in `do-connecting-ip` (`CLIENT_IP_HEADER` in de app-spec). Vergelijk vanaf één computer:

```bash
curl -si https://<app>/api/auth/me | grep -i ratelimit-remaining
curl -si https://<app>/api/auth/me -H "do-connecting-ip: 203.0.113.99" | grep -i ratelimit-remaining
```

Telt het tweede verzoek gewoon door (één lager dan het eerste), dan vervangt DigitalOcean een meegestuurde header door het echte adres, en is het goed. Begint het tweede opnieuw bij 299, dan laat DigitalOcean een vervalste header door. Gewone gebruikers merken daar niets van, maar iemand die het bewust doet, kan de limiet dan omzeilen.

## Dependabot

Wekelijks PR's naar `develop` voor de npm-packages van backend en frontend, GitHub Actions en de devcontainer-features.

De packages die bij de UI-bibliotheek horen (`radix-ui`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`, Figtree, `tailwindcss` en `@tailwindcss/vite`) krijgen alleen patch-updates. Minor- en major-versies gaan mee met een nieuwe tag van de bibliotheek (`.claude/rules/ui.md`), zodat de app op de versies blijft waarmee de bibliotheek getest is.

## Branch protection

Voor `main` en `develop`:

- PR verplicht, met review
- Status checks verplicht: Backend Checks, Smoke Test, Frontend Checks
- Branch moet up-to-date zijn
- CODEOWNERS-review verplicht
