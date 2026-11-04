---
'@dxos/ui-editor': patch
'@dxos/react-ui-form': patch
'@dxos/plugin-tasks': patch
'@dxos/plugin-routine': patch
'@dxos/plugin-code': patch
'@dxos/plugin-projects': patch
---

A project's editors show the other peers' carets: a spec's text, the feature sections embedded in it, the overview's Notes and the agent's instructions.

`Form.Root` takes `collaboration` (a space, an identity and the live object the form's values mirror). A markdown field then shows peers' carets, and a string field edits the object in place through `Doc.createAccessor`, so it needs no `Text` object. `Outline.Root` takes `presence` and `InstructionsEditor` takes `collaboration` for the same purpose; `DataExtensionsPresence` names the space and identity `createDataExtensions` reads. The `automerge` extension now creates an unset string on its first edit instead of throwing.
