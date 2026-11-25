# UI

De frontend gebruikt de Blue Bricks UI-bibliotheek op tag **v0.2.2**. Geïnstalleerd: `theme`, `utils`, `button`, `card`, `alert`, `app-shell` (met `badge` en `sheet`), `page-header`, `page-content`, `empty-state`.

## Pagina's

- `/login` staat buiten de shell (`pages/LoginPage.tsx`); elke andere pagina staat in de shell (`components/layout/AppLayout.tsx`, AppShell uit de bibliotheek).
- Een nieuwe pagina: een bestand in `pages/`, een route in `AppRoutes` (`App.tsx`) en een item in `config/navigation.ts`. Alleen voor beheer: de route in `<RoleRoute role="admin">`.
- Elke pagina volgt `pages/HomePage.tsx`: een `PageHeader` met de enige `h1`, daarna alles in `PageContent` (een `PageSection` per blok met een titel), en een `EmptyState` zolang er niets is. Nooit een eigen `<main>`: AppShell heeft die al.
- De naam staat in `config/app.ts`: `APP_NAME` is alleen de productnaam (de shell zet er "Blue Bricks" voor), `APP_TITLE` de volledige naam voor teksten.

## In deze template

- Componenten toevoegen vanuit `frontend/`, altijd op de tag van de app: `npx shadcn@4.23.0 add Nieradj-BB/BiBi-Reusable-Components/<item>#v0.2.2`. Vraag de developer eerst (het installeert packages).
- Bijwerken naar een nieuwe tag: voeg alle geïnstalleerde items in één commando opnieuw toe op de nieuwe tag (`--dry-run --diff` eerst, dan `--overwrite`), en zet de tag hier en in de items-lijst hierboven goed.
- `src/components/ui/`, `src/components/app-shell/`, `src/lib/utils.ts` en `src/styles/globals.css` komen van de registry: nooit met de hand wijzigen of formatteren (ze staan in `.prettierignore`). Eigen elementstijlen gaan onderaan `globals.css`, binnen `@layer base`.
- Lint dwingt de theme-regels af (`eslint-plugin-better-tailwindcss` met de lijst van de bibliotheek): paletkleuren, `white`/`black`, losse kleurwaarden, `dark:`, andere radii en schaduwen, en `outline-none` falen. Het Tailwind-palet is uitgezet in `globals.css`, dus een paletklasse is ook een onbekende klasse.
- De shadcn-CLI zet een `@custom-variant dark` in `globals.css`; laat die staan (anders verandert elke update het bestand). `dark:` blijft verboden.

## Blok uit de bibliotheek

Letterlijk overgenomen uit `docs/consumer-claude-md.md` van de bibliotheek; vervang het bij een nieuwe tag door de nieuwe versie. Waar het blok `npx shadcn@latest` zegt, gebruik je in deze app `npx shadcn@4.23.0`: dezelfde CLI-versie waarmee de bibliotheek bouwt, en de versie waarvoor `.claude/settings.json` om toestemming vraagt.

## UI library

- All UI comes from the Blue Bricks UI library: https://github.com/Nieradj-BB/BiBi-Reusable-Components (Storybook, `docs/components/`, `docs/decisions.md`).
- Install library items through the registry, always at the app's tag, with `save-exact=true` in the app's `.npmrc`: `npx shadcn@latest add Nieradj-BB/BiBi-Reusable-Components/<item>#v0.2.2`. Never install without a tag or from `#main`. Items land in `components/ui/` (blocks in `components/<name>/`); `theme` and `utils` come along with every component. To update, add every installed library item again at the newer tag in one command and review the diff (`--dry-run --diff`). Never edit or reformat installed library files or the theme in the CSS file (keep them in `.prettierignore`); leave the CLI's `@custom-variant dark` line in place.
- Never write your own version of a library component (button, input, select, checkbox, radio group, switch, date picker, badge, card, stat tile, accordion, alert, spinner, dialog, sheet, popover, tooltip, dropdown menu, toast, tabs, pagination, table, chart, page header, page content and page layout (padding, sections, section titles), app shell, ...). If something is missing, ask for it in the library repo.
- Use theme tokens only: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `bg-brand-cyan`, `border-border`, `var(--chart-1)`, ... `text-warning` and `border-warning` only for warning icons and borders. No hex, rgb or hsl values, no Tailwind palette colours (`bg-blue-500`, `text-gray-600`, `bg-white`), no arbitrary colours (`bg-[#...]`), no `dark:` variants (light mode only).
- Shape and type: `rounded-md` for controls, `rounded-xl` for cards, panels and dialogs, `rounded-full` for pills and circles; shadows `shadow-tile`, `shadow-tile-hover`, `shadow-card`, `shadow-panel` only; Figtree through `font-sans`, headings h1 to h3 take their weight and colour from the base style (set only the size). Icons from `lucide-react`, decorative icons `aria-hidden`.
- Accessibility: WCAG 2.2 AA for keyboard use, focus, labels and target sizes. Every interactive element keeps the library focus ring (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`).
