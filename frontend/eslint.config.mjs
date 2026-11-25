import js from "@eslint/js";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// The forbidden libraries from CLAUDE.md: use native ES2023+ or date-fns.
const FORBIDDEN_LIBRARIES = [
  "moment",
  "lodash",
  "jquery",
  "async",
  "underscore",
  "request",
  "bluebird",
  "q",
  "requirejs",
  "backbone",
].map((name) => ({
  name,
  message: "Verboden library (CLAUDE.md): gebruik native ES2023+ of date-fns.",
}));

// Classes that break the fixed theme of the Blue Bricks UI library: the same
// list the library lints itself with.
const variants = "^(?:.*:)?";
const palette =
  "slate|gray|zinc|neutral|stone|mauve|olive|mist|taupe|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const RESTRICTED_CLASSES = [
  {
    pattern: `${variants}-?[a-z]+(?:-[a-z]+)*-(?:${palette})-(?:50|[1-9]00|950)(?:/\\S+)?$`,
    message:
      "Tailwind-paletkleuren mogen niet: gebruik een theme-token zoals bg-primary, text-muted-foreground of bg-brand-cyan.",
  },
  {
    pattern: `${variants}-?[a-z]+(?:-[a-z]+)*-(?:white|black)(?:/\\S+)?$`,
    message:
      "white en black zijn geen theme-kleuren: gebruik bg-card, text-primary-foreground of text-foreground.",
  },
  {
    pattern:
      "\\[(?:color:)?(?:#|rgba?\\(|hsla?\\(|oklch\\(|oklab\\(|lab\\(|lch\\(|hwb\\(|color-mix\\()",
    message: "Losse kleurwaarden mogen niet: gebruik een theme-token.",
  },
  {
    pattern: `${variants}dark:.*$`,
    message: "Alleen light mode: geen dark:-varianten.",
  },
  {
    pattern: `${variants}(?!rounded(?:-(?:t|r|b|l|s|e|ss|se|ee|es|tl|tr|br|bl))?-(?:sm|md|xl|full|none)$)rounded(?:-.*)?$`,
    message:
      "Gebruik rounded-md (controls), rounded-xl (cards, panels, dialogs), rounded-full (pills, cirkels) of rounded-sm (staafuiteinden in grafieken).",
  },
  {
    pattern: `${variants}(?!shadow-(?:tile|tile-hover|card|panel|none)$)shadow(?:-.*)?$`,
    message:
      "Gebruik alleen de theme-schaduwen: shadow-tile, shadow-tile-hover, shadow-card of shadow-panel.",
  },
  {
    pattern: `${variants}(?:inset-shadow|drop-shadow|text-shadow)(?:-.*)?$`,
    message:
      "Gebruik alleen de theme-schaduwen: shadow-tile, shadow-tile-hover, shadow-card of shadow-panel.",
  },
  {
    pattern: "^outline-(?:none|hidden)$",
    message:
      "In Tailwind 4 heffen outline-none en outline-hidden de focusring op. Laat ze weg op focusbare elementen; gebruik focus:outline-none alleen op containers die nooit focus tonen.",
  },
];

// Tailwind 4 does not know the v3 notation `rounded-[--radius]`: it produces
// `border-radius: --radius`, invalid CSS the browser drops without a warning.
// A CSS function such as `--spacing(4)` is fine.
const TAILWIND_V3_VARIABLE = /-\[--[a-z][a-z0-9-]*[\]_,]/.source;
const TAILWIND_V3_MESSAGE =
  "Tailwind 4: gebruik de tokennaam of foo-(--var), niet foo-[--var].";

const COLOUR_LITERAL =
  "#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\\b|\\b(?:rgba?|hsla?|oklch|oklab|hwb)\\(";
const COLOUR_LITERAL_MESSAGE =
  "Kleurwaarden mogen niet in componenten: gebruik theme-tokens (bg-primary, var(--chart-1)).";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-var": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: FORBIDDEN_LIBRARIES,
          patterns: [
            {
              group: ["lodash/*", "lodash.*"],
              message: "Verboden library (CLAUDE.md): gebruik native ES2023+.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: `Literal[value=/${TAILWIND_V3_VARIABLE}/]`,
          message: TAILWIND_V3_MESSAGE,
        },
        {
          selector: `TemplateElement[value.raw=/${TAILWIND_V3_VARIABLE}/]`,
          message: TAILWIND_V3_MESSAGE,
        },
        {
          selector: `Literal[value=/${COLOUR_LITERAL}/]`,
          message: COLOUR_LITERAL_MESSAGE,
        },
        {
          selector: `TemplateElement[value.raw=/${COLOUR_LITERAL}/]`,
          message: COLOUR_LITERAL_MESSAGE,
        },
      ],
    },
  },
  {
    // Tailwind classes against the library theme: unknown, conflicting,
    // restricted and non-canonical classes fail. Class order is Prettier's job.
    files: ["src/**/*.tsx"],
    extends: [betterTailwindcss.configs["correctness-error"]],
    settings: {
      "better-tailwindcss": {
        entryPoint: "src/styles/globals.css",
        tsconfig: "tsconfig.app.json",
      },
    },
    rules: {
      "better-tailwindcss/no-restricted-classes": [
        "error",
        { restrict: RESTRICTED_CLASSES },
      ],
      "better-tailwindcss/no-duplicate-classes": "error",
      "better-tailwindcss/no-deprecated-classes": "error",
      "better-tailwindcss/no-unnecessary-whitespace": "error",
      "better-tailwindcss/enforce-canonical-classes": "error",
      "better-tailwindcss/enforce-consistent-class-order": "off",
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
    },
  },
  {
    // Library files: installed from the registry, never edited by hand. They
    // export their cva variants next to the component.
    files: ["src/components/ui/**", "src/lib/utils.ts"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
