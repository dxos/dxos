---
'@dxos/plugin-markdown': patch
'@dxos/ui-theme': patch
---

Inline object embeds in markdown documents are focus-gated: an embed is inert until clicked, so the wheel scrolls the document rather than the sketch or embedded document; once attended it takes input, shows a subtle focus border, keeps keys and scroll chaining inside, and returns focus to the editor on Escape. Document cards fade their snippet into the card on any surface. Theme ring tokens (`ring-focus-line`, `ring-offset-focus-offset`) survive `mx()` beside a ring colour. Scenes (`@dxos/plugin-spacetime`) render a card preview in object grids, remember their camera pose per scene, always save a selected object's colour change, and orbit with half the inertia. Mermaid diagrams (`@dxos/plugin-mermaid`) and tldraw canvases (`@dxos/plugin-tldraw`) follow the app's colour mode and design-system tokens; `mermaid()` accepts `theme`/`themeVariables`/`themeCSS`. Deleting a single card from a type view (`@dxos/plugin-space`) is undoable.
