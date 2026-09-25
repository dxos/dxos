---
'@dxos/plugin-markdown': minor
---

Replace each plugin's `./operations` and `./skills` barrel entrypoints with per-symbol subpaths. **Breaking:** import a handler set from its own subpath and read it off the namespace — `import * as MarkdownOperationHandlerSet from '@dxos/plugin-markdown/MarkdownOperationHandlerSet'; MarkdownOperationHandlerSet.handlers` in place of `import { MarkdownOperationHandlerSet } from '@dxos/plugin-markdown/operations'` — and import a skill from its own subpath, e.g. `import * as MarkdownSkill from '@dxos/plugin-markdown/MarkdownSkill'`. **Breaking:** plugin root barrels no longer re-export handler sets or skills, so those names must come from their subpaths. `@dxos/plugin-inbox` additionally publishes `./FeedCursor` and `./MessageExtractor`, and `@dxos/plugin-projects` renames `CodeProjectSkillDefinition` to the `./CodeProjectSkill` namespace.
