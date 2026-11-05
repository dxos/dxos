---
'@dxos/ui-editor': patch
'@dxos/plugin-tasks': patch
'@dxos/plugin-routine': patch
'@dxos/plugin-code': patch
'@dxos/plugin-projects': patch
---

A project's editors show the other peers' carets: the project's name and description, a spec's text, the feature sections embedded in it (name, description and requirements), the overview's Notes and the agent's instructions.

The carets come through the `extensions` each editor already takes: `ProjectHooks.useFieldExtensions` adds them per field, on a channel of the field's own, and `ProjectHooks.usePresenceExtensions` gives them alone. `InstructionsEditor` takes `extensions` for its form. A caret typed at the end of a line is shown there to other peers, not at the start of the next line.
