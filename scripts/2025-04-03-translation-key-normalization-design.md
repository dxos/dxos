# Translation Key Normalization

## Status

ESLint rule and migration script ready. Tested on `plugin-chess`.

## Problem

1,326 translation keys across 56 plugins use inconsistent space-separated naming with no enforced suffix convention. 135 keys lack a type suffix entirely. This makes it hard to grep, autocomplete, or validate keys.

## Convention

**Format:** `segment.camelCase.suffix`

```
settings.debug.label
addComment.label
objectName.placeholder
addSection.beforeDialog.title
typename.label_other
```

### Rules

- Every key ends with a **type suffix**: `label | message | placeholder | title | description | heading | alt | button`.
- Plural suffixes append after the type suffix: `typename.label_zero`, `lobby.participants_other`.
- Dots separate hierarchical segments; segments use camelCase.
- `plugin name` keys become `plugin.label`.

## Tools

### 1. ESLint Rule (ongoing enforcement)

`packages/common/eslint-plugin-rules/rules/translation-key-format.js`

Registered in `.oxlintrc.json` as `@dxos/eslint-plugin-rules/translation-key-format` (currently `warn`).

**Checks:**
- `useDotsNotSpaces` — flags space-separated keys, suggests dot.camelCase, auto-fixable.
- `missingSuffix` — flags keys missing a valid type suffix (not auto-fixable, needs human decision).

**Catches violations in:**
- `t('key')` calls in source files.
- Property keys in `translations.ts` files (string literal keys with string literal values).

**Auto-fix:** `moon run plugin-name:lint -- --fix` rewrites both definitions and usages.

**Promote to error** once migration is complete to prevent regressions.

### 2. Checker Script (bulk analysis)

`scripts/check-translations.mts` — run via `npx tsx scripts/check-translations.mts`.

Reports:

| Check | Current Count |
|---|---|
| Missing keys (used but undefined) | 68 |
| Unused keys (defined but unreferenced) | 444 |
| Incomplete plurals | 8 |
| Missing suffix | 135 |
| Non-hierarchical (space-separated) | 1,326 |

Use this for bulk analysis, migration planning, and tracking progress.

## Migration Plan

### Step 1: Fix known edge cases in normalizer

- `plugin name` → `plugin.label` (special case).
- Keys ending in nouns (`key`, `name`, `count`, `period`) that aren't valid suffixes need a suffix appended.

### Step 2: Migrate incrementally with `--fix`

Per plugin: `moon run plugin-name:lint -- --fix`, then verify with `moon run plugin-name:lint`.

Start with small plugins (`plugin-chess`, `plugin-template`), then batch the rest.

### Step 3: Validate

- Re-run checker script to confirm counts decrease.
- Build + test the migrated plugins.

### Step 4: Promote to error

Change `.oxlintrc.json` from `"warn"` to `"error"` once all plugins are clean.

## Out of Scope

- Moving to JSON files.
- Cleaning up unused keys (separate effort using checker output).
- UI packages / `osTranslations` namespace (phase 2).
