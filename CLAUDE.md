# Blue Bricks App

> **Stack versie:** 3.0 | **Laatst bijgewerkt:** november 2026

Blue Bricks bouwt webapplicaties met een vaste, bewezen stack. Deze repo is gestart vanuit het Blue Bricks-template: een werkend skelet zonder domein. Bij conflicten geldt CLAUDE.md voor stack en techniek, en `spec.md` voor de functionaliteit.

<!-- Nieuwe app: vervang de titel hierboven en zet hier in twee zinnen wat de app doet en voor wie. -->

## Waar staat wat

| Bestand                    | Inhoud                                                                 |
| -------------------------- | ---------------------------------------------------------------------- |
| `spec.md`                  | Functionele waarheid: wat de app doet en waarom, met genummerde besluiten |
| `GLOSSARY.md`              | Begrippen en hun naam in de code. Verplicht in UI-tekst, code en docs  |
| `docs/plan.md`             | Stappen, status en log                                                 |
| `docs/adr/`                | Architectuurbesluiten                                                  |
| `docs/ci-cd.md`            | Pipelines, deploy en branch protection                                 |
| `tasks/lessons.md`         | Lessen uit correcties (wordt hieronder geladen)                        |
| `.claude/rules/`           | Conventies, commands, workflow, MCP (automatisch geladen)              |

## Tech Stack

| Laag          | Technologie                                                          |
| ------------- | -------------------------------------------------------------------- |
| Frontend      | React 19 + TypeScript 5 + Vite 7, React Router, TanStack Query       |
| Styling       | Tailwind CSS 4 + Blue Bricks UI-bibliotheek v0.2.2 (shadcn-registry) |
| Backend       | Node.js 22 + Express 5 + TypeScript 5, helmet, express-rate-limit, pino |
| Database      | PostgreSQL 17 + Prisma 7 (driver adapter `@prisma/adapter-pg`)       |
| Authenticatie | Supabase Auth met Microsoft; tokens via JWKS (jose); rollen in eigen DB |
| Testing       | Vitest + Testing Library + supertest                                 |
| Hosting       | DigitalOcean App Platform; lokaal Docker of Codespace                |

Code staat in `backend/` en `frontend/`, elk een eigen npm-pakket. Commands, conventies en MCP-setup staan in `.claude/rules/`.

## Strikte regels

Lint dwingt de regels met (lint) af; de rest bewaakt de review.

- **Strict TypeScript:** geen `any`, geen `@ts-ignore`, geen `var` (lint)
- **Geen `console.log`:** alleen `console.warn` en `console.error`; in de backend de `logger` (lint)
- **Geen verboden libraries:** geen moment, lodash, jquery, async, underscore, request, bluebird, q, requirejs, backbone. Gebruik native ES2023+ of date-fns. (lint)
- **Exacte versies:** geen `^` of `~` in `package.json`
- **Prisma only:** geen raw SQL
- **Geen secrets in code:** alle credentials via `.env`; frontend-variabelen (`VITE_`) zijn openbaar
- **UI alleen uit de bibliotheek:** nooit een eigen versie van een bibliotheekcomponent; alleen theme-tokens, geen paletkleuren, losse kleurwaarden of `dark:` (lint). Zie `.claude/rules/ui.md`.
- **Eén CSS-bestand:** `frontend/src/styles/globals.css`, geschreven door de registry; verder alleen Tailwind-classes
- **Taal:** Engelse namen in code, Nederlandse tekst voor gebruikers
- **Geen persoonsgegevens** (naam, e-mail) naar externe diensten: niet in headers, URL's, payloads of een User-Agent
- **Geen verwijzingen naar projectdocumenten** ("besluit 12", "spec.md §3") in tekst die een gebruiker ziet; die horen in commentaar, commits en docs

## Ask before acting

Vraag de developer voordat je:

- een npm-package installeert of een versie wijzigt
- afwijkt van de mapstructuur
- raw SQL schrijft of een migratie toepast buiten de lokale database
- een nieuw API-responseformaat introduceert
- security-middleware, auth of de dev-login aanpast
- TypeScript strict mode uitzet of een lintregel uitschakelt
- iets wijzigt in een extern systeem (Supabase, DigitalOcean, Entra, GitHub-instellingen)
- een pull request aanmaakt

## Plan mode

Gebruik plan mode (Shift+Tab 2x) voor taken die meer dan 2 bestanden raken of een architectuurkeuze bevatten. Zie `.claude/rules/workflow-orchestration.md`.

## Git workflow

```
feature/* → develop (staging) → main (productie)
hotfix/*  → main (+ cherry-pick naar develop)
```

`develop` en `main` zijn protected en vereisen een PR met review. Committen en pushen naar de eigen feature-branch mag; een PR alleen op verzoek van de developer.

## Slash commands

| Command               | Beschrijving                                                                 |
| --------------------- | ---------------------------------------------------------------------------- |
| `/commit`             | Commit-check (testresten, debugcode, TODO's) + conventional commit message   |
| `/pr`                 | Checks draaien, PR-beschrijving schrijven, PR aanmaken via `gh`              |
| `/catchup`            | Git-status en wijzigingen samenvatten na `/clear`                            |
| `/fix <beschrijving>` | Gestructureerd debuggen: analyseren, fixen en verifiëren                     |

## Omvang van deze bestanden

CLAUDE.md, de rules en `tasks/lessons.md` laden elke sessie. Houd CLAUDE.md onder 10 KB en lessons onder 15 KB: domeinbegrippen horen in `GLOSSARY.md`, functionele details in `spec.md`. Formatteer deze Markdown niet met Prettier: brede tabellen worden dan opgevuld met spaties.

## Compaction

When compacting, always preserve: the full list of modified files, the current git branch, any failing test commands, the active step from docs/plan.md, and recent learnings from tasks/lessons.md.

## Lessons

@tasks/lessons.md
