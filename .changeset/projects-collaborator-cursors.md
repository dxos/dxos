---
'@dxos/ui-editor': patch
'@dxos/react-ui-form': patch
'@dxos/plugin-tasks': patch
'@dxos/plugin-routine': patch
'@dxos/plugin-code': patch
'@dxos/plugin-projects': patch
---

A project's editors show the other peers' carets: the project's name and description, a spec's text, the feature sections embedded in it (name, description and requirements), the overview's Notes and the agent's instructions.

`Form.Root` takes `collaboration` (a space and an identity). Its editors bound in place (collaborative strings of the form's `object` and `Ref<Text>` fields) then show peers' carets, each string on its own awareness channel; `CollaborativeTextEditor` and `RequirementEditor` take the same as `presence`. `Outline.Root` takes `presence` and `InstructionsEditor` takes `collaboration` for the same purpose; `DataExtensionsPresence` names the space and identity `createDataExtensions` reads. A caret typed at the end of a line is shown there to other peers, not at the start of the next line.
