# MCP Servers

| Server   | Type       | Doel                                    | Setup                                                                                                   |
| -------- | ---------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Supabase | HTTP/OAuth | Auth-instellingen en users inzien       | `/mcp` en inloggen via de browser. Zet `&project_ref=<ref>` achter de URL in `.mcp.json` zodra het project bestaat. |

De Supabase-server staat op `read_only=true`. Wijzigingen in Supabase doet de developer zelf.

## Bewust niet

- **Postgres**: `@modelcontextprotocol/server-postgres` is gearchiveerd en de read-only-modus is met SQL-injectie te omzeilen. Inspecteer de lokale database met `docker compose exec db psql -U app -d app`.
- **DigitalOcean**: geeft de agent schrijfrechten op infrastructuur. Gebruik `doctl` met een token met beperkte scope, en vraag de developer vóór elke wijziging. Let op: sommige `doctl databases`-commando's drukken een verbindings-URI met wachtwoord af; gebruik `-o json | jq` en laat `password`, `connection` en `uri` weg.

`.mcp.json` vult `${...}` in vanuit de shell waarin Claude Code start, niet vanuit een `.env`-bestand.
