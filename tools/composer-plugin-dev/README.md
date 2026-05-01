# composer-plugin-dev

A Claude Code plugin that bundles authoring guidance for **DXOS Composer plugins**.

The default audience is community authors building a plugin in their **own repository** (Vite + `composerPlugin`, GitHub release with `manifest.json` + `plugin.mjs`, registered via [`dxos/community-plugins`](https://github.com/dxos/community-plugins)). Each topic has a "**Inside the dxos monorepo**" callout that flags how the in-repo workflow differs (moon, `workspace:*` deps, exports subpaths, `composer-app` registration, `PLUGIN.mdl`).

## Contents

- `skills/composer-plugin-dev/SKILL.md` — topic index. Start here.
- `skills/composer-plugin-dev/references/*.md` — one file per topic.
- `commands/new-composer-plugin.md` — `/new-composer-plugin <name>` scaffold.
- `commands/audit-composer-plugin.md` — `/audit-composer-plugin <path>` review.
- `agents/composer-plugin-reviewer.md` — review subagent.

## Install (local marketplace)

Lives at `tools/composer-plugin-dev/` in the dxos monorepo. Add this directory as a local plugin source in `~/.claude/settings.json`, or invoke via `/plugin` after pointing Claude Code at it.
