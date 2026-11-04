---
'@dxos/plugin-code': minor
'@dxos/plugin-markdown': minor
'@dxos/react-ui-editor': minor
'@dxos/ui-editor': minor
---

The arrow keys stop on an embedded block instead of skipping it. A selected embed has focus, attention and a focus ring. Enter goes into it, Escape from inside selects it again, and Escape on the selection returns to the line after it, or before it when none follows. From a selected embed, the arrows go on to the text or the next embed, Alt+Up and Alt+Down move it, and Backspace or Delete removes it. An embed renders its content in `Editor.BlockFrame`, which takes the focus, draws the ring and answers these keys through `handleBlockWidgetKey`. plugin-markdown contributes its object embed as `MarkdownCapabilities.ObjectEmbed`, and a spec draws its features through it, so a feature embed is the same in a spec and in a Markdown document.
