---
'@dxos/ui-editor': patch
---

- **Remote cursor name:** a collaborator's name shows as a tooltip above their caret on hover, drawn outside the editor's scroller so it is never clipped (it flips below only when the window has no room above). The name also stays inside its coloured label on list lines, and the caret carries it as visually hidden text for assistive tech.
