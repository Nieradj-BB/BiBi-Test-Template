#!/bin/bash
# .claude/hooks/post-edit-format.sh
# Formats every file Claude edits in backend/ or frontend/ with that package's
# Prettier. Files elsewhere (CLAUDE.md, docs/) stay as written: Prettier pads
# wide Markdown tables, which bloats files that load into every session.
# Non-blocking: always exits 0.

INPUT=$(cat)
ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Prints "<package>\t<absolute path>" for a file inside backend/ or frontend/.
TARGET=$(printf '%s' "$INPUT" | ROOT="$ROOT" node -e '
  const path = require("node:path");
  let s = "";
  process.stdin.on("data", (d) => (s += d)).on("end", () => {
    try {
      const file = JSON.parse(s).tool_input?.file_path;
      if (!file || !/\.(ts|tsx|js|jsx|mjs|mts|json|css|html)$/.test(file)) return;
      const abs = path.resolve(process.env.ROOT, file);
      const [pkg] = path.relative(process.env.ROOT, abs).split(path.sep);
      if (pkg === "backend" || pkg === "frontend") process.stdout.write(`${pkg}\t${abs}`);
    } catch {}
  });
' 2>/dev/null)

[ -z "$TARGET" ] && exit 0

PKG="${TARGET%%$'\t'*}"
FILE="${TARGET#*$'\t'}"

if [ -x "$ROOT/$PKG/node_modules/.bin/prettier" ]; then
  (cd "$ROOT/$PKG" && ./node_modules/.bin/prettier --write "$FILE" >/dev/null 2>&1) || true
fi

exit 0
