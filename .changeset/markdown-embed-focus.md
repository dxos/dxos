---
'@dxos/plugin-markdown': patch
'@dxos/ui-theme': patch
---

Inline object embeds in markdown documents must be clicked to take input: an unfocused embed is inert (the wheel scrolls the document, not the sketch or embedded document) and shows a focus ring once attended; Escape returns focus to the editor. Theme ring tokens (`ring-focus-line`, `ring-offset-focus-offset`) now survive `mx()` beside a ring colour. Scenes (`@dxos/plugin-spacetime`) now render a card-content preview in object grids, and a scene's camera pose is remembered per scene across navigation and reloads.
