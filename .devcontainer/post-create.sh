#!/usr/bin/env bash
# Once, after the Codespace is created (postCreateCommand): install
# dependencies, generate the Prisma client and create the .env files. An
# existing .env is never changed. The database starts in post-start.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The database from docker-compose.yml, as the backend reaches it here.
DATABASE_URL_CODESPACE="postgresql://app:app@localhost:5432/app"

say() {
  echo "[post-create] $*"
}

# set_value FILE KEY VALUE: replaces the line KEY=... in FILE, or appends it.
# Through awk and ENVIRON, so characters such as / and + (base64) are safe.
set_value() {
  local file="$1" key="$2" value="$3" tmp
  tmp="$(mktemp)"
  KEY="$key" VALUE="$value" awk '
    BEGIN { done = 0 }
    index($0, ENVIRON["KEY"] "=") == 1 {
      print ENVIRON["KEY"] "=" ENVIRON["VALUE"]
      done = 1
      next
    }
    { print }
    END { if (!done) print ENVIRON["KEY"] "=" ENVIRON["VALUE"] }
  ' "$file" >"$tmp"
  cat "$tmp" >"$file"
  rm -f "$tmp"
}

# A random secret for the dev login: 36 bytes, 48 characters base64.
new_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 36
  else
    node -e 'process.stdout.write(require("node:crypto").randomBytes(36).toString("base64"))'
  fi
}

# create_env DIR: copies DIR/.env.example to DIR/.env, only when DIR/.env does
# not exist yet. Returns 1 when nothing was created.
create_env() {
  local dir="$1"
  if [ -e "$dir/.env" ]; then
    say "$dir/.env already exists; left unchanged."
    return 1
  fi
  if [ ! -f "$dir/.env.example" ]; then
    say "ERROR: $dir/.env.example is missing; cannot create $dir/.env." >&2
    exit 1
  fi
  # Readable for the own user only: a secret goes in. Inside `if create_env`
  # set -e does not apply, so catch the error explicitly.
  if ! (umask 077 && cp "$dir/.env.example" "$dir/.env"); then
    say "ERROR: could not create $dir/.env." >&2
    exit 1
  fi
  return 0
}

say "Installing dependencies in backend/ (npm ci)..."
(cd "$ROOT/backend" && npm ci)

say "Installing dependencies in frontend/ (npm ci)..."
(cd "$ROOT/frontend" && npm ci)

if create_env "$ROOT/backend"; then
  set_value "$ROOT/backend/.env" DATABASE_URL "$DATABASE_URL_CODESPACE"
  set_value "$ROOT/backend/.env" DEV_LOGIN_ENABLED "true"
  set_value "$ROOT/backend/.env" DEV_LOGIN_SECRET "$(new_secret)"
  say "backend/.env created: database from docker-compose.yml, dev login on, with a new DEV_LOGIN_SECRET."
fi

if create_env "$ROOT/frontend"; then
  set_value "$ROOT/frontend/.env" VITE_DEV_LOGIN_ENABLED "true"
  say "frontend/.env created: dev login on."
fi

# Prisma 7 does not generate the client on npm ci. Generate does not connect
# to the database; prisma.config.ts does read DATABASE_URL from backend/.env.
say "Generating the Prisma client..."
(cd "$ROOT/backend" && ./node_modules/.bin/prisma generate)

say "Done. The database starts on every start of the Codespace (post-start.sh)."
