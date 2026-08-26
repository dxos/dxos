---
'@dxos/compute': minor
'@dxos/assistant': minor
---

Model-facing tool names now derive from an operation's DXN key, never from `meta.name`.

`Operation.toolName(op)` is the single derivation — strip the constant `org.dxos.function.` prefix, kebab-case each camelCase segment, join with `-`, so `org.dxos.function.markdown.create` becomes `markdown-create` and `org.dxos.function.project.artifactAdd` becomes `project-artifact-add`. Keys outside that prefix keep every segment. `Operation.toolNameFromKey` does the same for a persisted record's key.

Both the tool runtime and `Skill.toolDefinitions` use it, so a skill's `tools` array and the names the model calls are one identifier space; the lookup that previously bridged the two is gone. This makes `meta.name` pure display copy — rewording it no longer renames a tool — and removes the live collisions where `create` was claimed by plugin-markdown, plugin-script and plugin-sheet, `open` by plugin-markdown and plugin-transcription, and `update` by plugin-markdown and plugin-script. `createToolkit` now asserts tool-name uniqueness across an assembled session toolkit.

The derivation is not injective: kebab-casing makes `webSearch` and `web-search` converge, and
hyphenated segments are live (`plugin-crm`, `web-search`). Two keys claiming one name is an authoring
error, caught by `Operation.findToolNameCollisions` where the app registers every operation, and by the
tool resolver, which fails rather than picking the first match.

Breaking for anything that hardcodes a tool name: skill instruction texts should interpolate `Operation.toolName(Op)` rather than spell the name out, and recorded model-conversation fixtures that captured the old names must be regenerated.
