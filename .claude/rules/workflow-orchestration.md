# Workflow Orchestration

## Plan mode

- Verplicht bij taken die meer dan 2 bestanden raken of een architectuurbeslissing bevatten
- Itereer op het plan tot de developer het goedkeurt, dan pas implementeren
- Leg in het plan vast wat de gebruiker ziet bij lege, foute en randgevallen; neem zo'n keuze nooit stil zelf
- Als iets misgaat: STOP en plan opnieuw, niet doorduwen op een falende aanpak
- Na 2 mislukte correcties: `/clear` en opnieuw beginnen met een betere prompt
- Geen plan nodig voor triviale taken (typo, rename, fix in één bestand)

## Subagents

- Gebruik subagents voor onderzoek: dat houdt de hoofdcontext schoon
- Eén taak per subagent; onafhankelijke taken parallel
- Vat resultaten samen, stuur ze niet één-op-één door
- Geen persoonsgegevens in een opdracht aan een subagent met internettoegang

## Verificatie

- NOOIT een taak als klaar melden zonder bewijs dat het werkt
- Draai de checks per pakket: `npm run typecheck`, `npm run lint`, `npm run test:run`
- Bij UI-wijzigingen: bekijk het resultaat in de browser (preview via `.claude/launch.json`, inloggen met de dev-login) in plaats van het te beschrijven
- Lokaal groen is geen bewijs dat CI groen is: een verse checkout mist gegenereerde bestanden (zoals de Prisma-client)
- Vraag jezelf: "Zou een senior engineer dit goedkeuren?"

## Autonoom werken

- Bij een bugmelding: analyseer en fix direct, niet vragen "wat wil je dat ik doe?"
- Wijs naar logs, errors en falende tests en los ze op
- Bij falende CI op je eigen branch: fixen zonder dat het gevraagd wordt
- Gebruik `/fix` voor gestructureerd debuggen bij complexe bugs
- Committen en pushen naar de eigen feature-branch mag; een PR alleen als de developer erom vraagt

## Kernprincipes

- **Eenvoud**: elke wijziging zo klein en eenvoudig mogelijk
- **Oorzaak**: vind de echte oorzaak, geen tijdelijke workarounds
- **Minimale impact**: raak alleen aan wat nodig is
- **Elegantie (met mate)**: vraag bij niet-triviale wijzigingen of het eleganter kan, maar over-engineer niet

## Self-improvement

- Na ELKE correctie van de developer: reflecteer, abstraheer en schrijf de les naar `tasks/lessons.md`
- `tasks/lessons.md` wordt elke sessie geladen (via CLAUDE.md); herhaal geen fouten die er al in staan
- Een les die voor elke app geldt (stack, tooling, CI), hoort in de template: zet hem onder "Naar de template"
