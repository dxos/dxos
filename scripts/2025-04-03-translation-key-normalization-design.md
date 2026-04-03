# Translation Key Normalization

## Status

Prototype complete. Ready for incremental rollout.

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

## Checker Script

`scripts/check-translations.mts` — reports:

| Check | Current Count |
|---|---|
| Missing keys (used but undefined) | 68 |
| Unused keys (defined but unreferenced) | 444 |
| Incomplete plurals | 8 |
| Missing suffix | 135 |
| Non-hierarchical (space-separated) | 1,326 |

## Migration Plan

### Step 1: Refine normalizer

Fix `toDotNotation()` edge cases:
- Multi-word suffixes (`mark read` → keep as `markRead` not split on `read`).
- Noun words (`key`, `name`, `count`, `period`) are not suffixes — append `.label` when no valid suffix present.
- `plugin name` → `plugin.label`.

### Step 2: Generate migration map

Produce `{ namespace, oldKey, newKey }[]` JSON. Review before applying.

### Step 3: Auto-apply renames

Two passes per plugin:
- **A:** Rewrite keys in `translations.ts`.
- **B:** Rewrite `t('old key')` and `['old key', { ns }]` in source files.

### Step 4: Validate

Re-run checker: zero missing-suffix, zero new mismatches. Build + lint.

### Step 5: Incremental rollout

One plugin at a time. Start with `plugin-template` or `plugin-chess` (small surface area), then batch the rest.

## Out of Scope

- Moving to JSON files.
- Cleaning up unused keys (separate effort using checker output).
- UI packages / `osTranslations` namespace (phase 2).
