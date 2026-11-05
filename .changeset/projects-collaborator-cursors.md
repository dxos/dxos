---
'@dxos/ui-editor': patch
'@dxos/ui-types': patch
'@dxos/react-ui-form': patch
'@dxos/plugin-tasks': patch
'@dxos/plugin-routine': patch
'@dxos/plugin-code': patch
'@dxos/plugin-projects': patch
---

A project's editors show the other peers' carets: the project's name and description, a spec's text, the feature sections embedded in it (name, description and requirements), the overview's Notes and the agent's instructions.

A form no longer binds collaborative strings itself. `Form.Root` drops `object`, and a field with `fieldOverrides.collaborative` takes its binding from the form's `extensions`, which a host builds with `createDataExtensions`. `CollaborativeTextEditor` is now `InputEditor`: a CodeMirror editor framed as an input (or, given `rows`, a text area) that takes `extensions` or a `value` and `onChange`, and the markdown field's editor is built on it. `CollaborativeAnnotation` and `CollaborativeAnnotationId` are removed. The automerge extension now binds to an unset string, which reads as empty and is created by the first edit.

`ProjectHooks.useFieldExtensions` gives each field the binding, the other peers' carets on a channel of the field's own, and the comments; `ProjectHooks.useDataExtensions` gives the binding and carets alone. `InstructionsEditor` takes `extensions` for its form. A caret typed at the end of a line is shown there to other peers, not at the start of the next line.
