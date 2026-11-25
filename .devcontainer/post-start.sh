#!/usr/bin/env bash
# On every start of the Codespace (postStartCommand): start the database from
# docker-compose.yml, wait until it is ready, and apply the migrations. The
# data stays in the app_db volume.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Always the database from docker-compose.yml, whatever backend/.env says:
# this script only migrates the database it starts itself.
DATABASE_URL_CODESPACE="postgresql://app:app@localhost:5432/app"

say() {
  echo "[post-start] $*"
}

fail() {
  echo "[post-start] ERROR: $*" >&2
  exit 1
}

# Only in a container (Codespace or Dev Container), never on a laptop.
if [ "${CODESPACES:-}" != "true" ] && [ "${REMOTE_CONTAINERS:-}" != "true" ] && [ ! -f /.dockerenv ]; then
  fail "this script belongs to the Codespace (.devcontainer/). Start the database yourself locally, see README.md."
fi

# Docker-in-docker starts its daemon together with the container; wait for it.
say "Waiting for Docker..."
for _ in $(seq 1 60); do
  if docker info >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker info >/dev/null 2>&1 || fail "Docker is still unreachable after 60 seconds."

cd "$ROOT"
say "Starting the database (docker compose up -d --wait db)..."
if ! docker compose up -d --wait db; then
  docker compose logs --tail 50 db >&2 || true
  fail "the database did not become healthy."
fi
say "Database ready on localhost:5432."

cd "$ROOT/backend"
[ -x ./node_modules/.bin/prisma ] || fail "backend/node_modules is missing. Run first: bash .devcontainer/post-create.sh"

say "Applying migrations (prisma migrate deploy)..."
DATABASE_URL="$DATABASE_URL_CODESPACE" ./node_modules/.bin/prisma migrate deploy

say "Done. Start the app with 'npm run dev' in backend/ and in frontend/ (two terminals)."
