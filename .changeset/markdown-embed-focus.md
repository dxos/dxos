---
'@dxos/plugin-markdown': patch
'@dxos/ui-theme': patch
---

Inline object embeds in markdown documents must be clicked to take input: an unfocused embed is inert (the wheel scrolls the document, not the sketch or embedded document) and shows a focus ring once attended; Escape returns focus to the editor. Theme ring tokens (`ring-focus-line`, `ring-offset-focus-offset`) now survive `mx()` beside a ring colour. Scenes (`@dxos/plugin-spacetime`) now render a card-content preview in object grids, and a scene's camera pose is remembered per scene across navigation and reloads. Changing a selected scene object's colour is always saved (previously dropped after selecting an object that already matched the picker), and the orbit camera coasts half as far. Mermaid diagrams (`@dxos/plugin-mermaid`) follow the app's colour mode and design-system tokens, re-render when the mode switches, and accept `theme`/`themeVariables`/`themeCSS` options.
