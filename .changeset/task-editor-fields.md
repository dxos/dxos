---
'@dxos/echo': patch
'@dxos/plugin-markdown': patch
---

The task list editor's title is a standard Input and its description sits in a ControlFrame that shows the focus ring; the task set article has one layout whether it is opened as a plank or embedded as a section. `TaskEditor` is removed: the task article renders a form over the `Task` schema, whose description is now a Markdown field, and `Form.Root` takes `markdownExtensions` for the editor extensions a host contributes to its markdown fields.
