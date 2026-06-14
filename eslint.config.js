import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

// Ported from the legacy .eslintrc.json (eslint:recommended, node env,
// ecmaVersion latest, no custom rules) into ESLint 9 flat config. The TS
// parser/plugin are wired up so `eslint .` lints the .ts source. The
// typescript-eslint "eslint-recommended" override turns off the core JS rules
// that TypeScript already covers (no-undef, no-unused-vars) so they stop
// false-flagging ambient types and enum members, then re-applies the
// TS-aware equivalents.
export default [
  {
    ignores: ["node_modules/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs["eslint-recommended"].overrides[0].rules,
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
];
