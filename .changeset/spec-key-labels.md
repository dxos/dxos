---
'@dxos/plugin-projects': patch
'@dxos/react-ui-editor': patch
---

A spec now opens on its source, which shows each feature and requirement by its label (`F-3`, `F-3.2`), as the forms do, in place of the random key the text stores. A key can no longer be edited there, but a label can be selected on its own, and copying it copies the label. Enter at the end of a requirement starts the next one under a fresh key, ready for its text, and Backspace on an empty requirement removes it. A reference field such as `depends` shows the label of the item it names. The editor's view menu now names its views Preview, Source and Read only, where Preview was labelled Markdown and Source was labelled Plain text; the projects plugin's Default spec view setting uses the same names.
