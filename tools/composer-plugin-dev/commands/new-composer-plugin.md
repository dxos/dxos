---
description: Scaffold a new DXOS Composer plugin (community-style by default).
argument-hint: <plugin-name> [--monorepo]
---

You are scaffolding a new DXOS Composer plugin.

**Args:** `$ARGUMENTS`

The first positional argument is the plugin name in kebab-case (e.g. `pomodoro`). If `--monorepo` is passed, scaffold inside `packages/plugins/plugin-<name>/`. Otherwise scaffold at the repo root for a standalone community plugin.

## Procedure

1. Read the relevant references in this order, **only the ones you need**:
   - `skills/composer-plugin-dev/references/scaffolding.md`
   - `skills/composer-plugin-dev/references/directory-structure.md`
   - `skills/composer-plugin-dev/references/plugin-definition.md`
   - `skills/composer-plugin-dev/references/types-schema.md`
   - `skills/composer-plugin-dev/references/translations.md`
   - For monorepo only: `skills/composer-plugin-dev/references/specification.md`, `skills/composer-plugin-dev/references/moon-yml.md`, `skills/composer-plugin-dev/references/registration.md`
2. **Confirm with the user before writing files**: plugin name, typename namespace (e.g. `com.example.type.thing`), icon (Phosphor `ph--*--regular`), iconHue, one initial ECHO type and its fields.
3. Generate the minimum skeleton from `scaffolding.md` — `meta.ts`, `translations.ts`, one type, one container, one surface, plugin file, `package.json`, `vite.config.ts` (community) or `moon.yml` + `PLUGIN.mdl` (monorepo).
4. **Do not** add operations, blueprints, or settings yet — the user adds those incrementally.
5. Build and verify before declaring done.

For monorepo plugins, **the `PLUGIN.mdl` must be approved by the user before any code is written.**
