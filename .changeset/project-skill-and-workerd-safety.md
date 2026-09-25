---
'@dxos/echo': patch
'@dxos/compute': patch
'@dxos/app-framework': patch
'@dxos/app-toolkit': patch
'@dxos/plugin-assistant': patch
'@dxos/plugin-calls': patch
'@dxos/plugin-chess': patch
'@dxos/plugin-chess-com': patch
'@dxos/plugin-client': patch
'@dxos/plugin-connector': patch
'@dxos/plugin-debug': patch
'@dxos/plugin-devtools': patch
'@dxos/plugin-file': patch
'@dxos/plugin-google': patch
'@dxos/plugin-inbox': patch
'@dxos/plugin-jmap': patch
'@dxos/plugin-kanban': patch
'@dxos/plugin-magazine': patch
'@dxos/plugin-map': patch
'@dxos/plugin-map-solid': patch
'@dxos/plugin-markdown': patch
'@dxos/plugin-observability': patch
'@dxos/plugin-pipeline': patch
'@dxos/plugin-presenter': patch
'@dxos/plugin-preview': patch
'@dxos/plugin-projects': patch
'@dxos/plugin-registry': patch
'@dxos/plugin-review': patch
'@dxos/plugin-routine': patch
'@dxos/plugin-sample': patch
'@dxos/plugin-script': patch
'@dxos/plugin-sequencer': patch
'@dxos/plugin-sheet': patch
'@dxos/plugin-space': patch
'@dxos/plugin-table': patch
'@dxos/plugin-tasks': patch
'@dxos/plugin-thread': patch
'@dxos/plugin-transcription': patch
'@dxos/plugin-trip': patch
'@dxos/plugin-wnfs': patch
---

Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships a project-management skill for external agents — including the `/codeProject setup` flow that binds a repo to an existing space. The skill's key segment is `codeProject` because the segment doubles as the projected MCP prompt name and plain `project` belongs to assistant-toolkit's own skill.

`toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (as a wire boundary may do for schema-unaware consumers) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical to previous releases.

Worker (`workerd`) bundles no longer pull in React. Wrangler resolves `workerd, worker, browser` and never `node`, so a `#capabilities` map offering only `node` and `default` handed workers the browser barrel and its React surfaces. Every plugin with a headless entry now resolves a server-safe barrel under a `workerd` condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions a worker actually resolves — so a reintroduced leak fails the check instead of passing against a build that is never shipped.
