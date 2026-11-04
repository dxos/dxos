---
'@dxos/plugin-code': minor
'@dxos/plugin-markdown': patch
'@dxos/ui-editor': minor
---

The arrow keys stop on an embedded block instead of skipping it. A selected embed has focus, attention and a focus ring. Enter goes into it, Escape from inside selects it again, and Escape on the selection returns to the line after it, or before it when none follows. From a selected embed, the arrows go on to the text or the next embed, Alt+Up and Alt+Down move it, and Backspace or Delete removes it. `handleBlockWidgetKey` gives an embed's container these keys.
