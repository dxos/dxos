---
'@dxos/plugin-transcription': patch
'@dxos/react-ui-menu': patch
'@dxos/plugin-markdown': patch
'@dxos/plugin-support': patch
'@dxos/plugin-review': patch
'@dxos/app-toolkit': patch
'@dxos/ui-types': patch
---

Keep guided tours working on a narrow plank: a step pointing at a toolbar control now opens the overflow menu when the toolbar has folded that control away, and a step whose target never appears is stepped over rather than ending the tour.
