---
'@dxos/echo': patch
'@dxos/compute': patch
'@dxos/plugin-projects': patch
'@dxos/plugin-client': patch
'@dxos/plugin-connector': patch
'@dxos/plugin-markdown': patch
'@dxos/plugin-routine': patch
'@dxos/plugin-chess': patch
'@dxos/plugin-chess-com': patch
'@dxos/plugin-kanban': patch
'@dxos/plugin-map': patch
'@dxos/plugin-review': patch
'@dxos/plugin-sample': patch
'@dxos/plugin-script': patch
'@dxos/plugin-sheet': patch
'@dxos/plugin-table': patch
'@dxos/plugin-thread': patch
'@dxos/plugin-transcription': patch
---

Projects gain a lifecycle `status` field (`active | paused | blocked | ended`), surfaced through the MCP-projected verbs, and plugin-projects ships `ProjectsSkillDefinition` — the space-backed project-management workflow for external agents, including the `/project setup` flow that binds a repo to an existing space.

`toEffectSchema` recognizes ECHO's reference sentinel before the generic `type: 'object'` branch, so a reference node widened with structural keywords (e.g. an MCP wire schema) decodes as a reference instead of a plain struct. Serialization is unchanged — persisted schemas stay byte-identical.

Worker (`workerd`) bundles no longer pull in React: plugins with headless variants resolve a React-free `#capabilities` barrel via a `workerd` export condition, and the `check-module-structure` guards trace with `workerd,worker` — the conditions wrangler actually uses — so a reintroduced leak fails the check.
