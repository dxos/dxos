---
'@dxos/react-ui-editor': patch
'@dxos/plugin-projects': patch
---

The editor's view menu names its views Preview, Source and Read only. Preview was labelled Markdown, which was wrong for an editor that draws something other than Markdown, such as a spec's forms, and Source was labelled Plain text. The projects plugin's Default spec view setting uses the same names, and when it is unset a spec now opens on its source rather than its forms.
