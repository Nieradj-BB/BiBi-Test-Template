#!/bin/bash
# .claude/hooks/pre-commit-guard.sh
# Block-at-submit: Claude works freely, but a commit is blocked when the
# checks of the staged package fail. Runs before every Bash and PowerShell
# call and exits right away unless the command commits.

set -uo pipefail

INPUT=$(cat)

# Parse with Node (always present in this project), not jq.
COMMAND=$(printf '%s' "$INPUT" | node -e '
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    try { process.stdout.write(JSON.parse(s).tool_input?.command ?? ""); } catch {}
  });
')

# A git commit anywhere in the command: also after `cd x &&`, `;`, inside a
# PowerShell `if (...) { ... }` block, or with `git -C dir`.
if ! printf '%s' "$COMMAND" | grep -qE '(^|[;&|({])[[:space:]]*git([[:space:]]+-C[[:space:]]+[^[:space:]]+)?[[:space:]]+commit([[:space:]]|$)'; then
  exit 0
fi

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$ROOT" || exit 0

echo "Pre-commit checks..." >&2

ERRORS=""
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)

for pkg in backend frontend; do
  if echo "$STAGED_FILES" | grep -q "^$pkg/" && [ -f "$pkg/package.json" ]; then
    echo "  → $pkg typecheck..." >&2
    if ! (cd "$pkg" && npm run typecheck --silent >&2 2>&1); then
      ERRORS="${ERRORS}\n- $pkg: TypeScript errors"
    fi
    echo "  → $pkg lint..." >&2
    if ! (cd "$pkg" && npm run lint --silent >&2 2>&1); then
      ERRORS="${ERRORS}\n- $pkg: lint errors"
    fi
  fi
done

# Versions from known npm compromises (see also CI).
COMPROMISED="chalk@5\.6\.1|debug@4\.4\.2|ansi-styles@6\.2\.2|supports-color@10\.2\.1|strip-ansi@7\.1\.1|color@5\.0\.1|color-convert@3\.1\.1|color-name@2\.0\.1|color-string@2\.1\.1|duckdb@1\.3\.3"
for lockfile in backend/package-lock.json frontend/package-lock.json; do
  if [ -f "$lockfile" ] && grep -qE "$COMPROMISED" "$lockfile"; then
    ERRORS="${ERRORS}\n- compromised package in $lockfile"
  fi
done

if [ -n "$ERRORS" ]; then
  echo -e "\nCommit blocked. Fix these first:${ERRORS}" >&2
  echo -e "\nRun 'npm run typecheck' and 'npm run lint' in the package to see the errors." >&2
  exit 2
fi

echo "Pre-commit checks passed" >&2
exit 0
