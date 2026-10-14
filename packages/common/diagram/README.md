# @dxos/diagram

Renderer-neutral diagram model: the scene DSL (`Scene`), command application over any record map
(`applyCommands` / `ContentHandler`), diagram dialects that compile higher-level languages to scene
commands (`Mermaid`, `Uml`, `UmlGrid`, `Ui`), the layout engines behind them (`Layout`, `UmlEngine`,
`UmlSearch`, `UmlRules`, `Objective`), and layout diagnostics (`Diagnostics`).

The package is headless: no ECHO, no React. `@dxos/plugin-illustrator` binds the model to
`Drawing` objects and contributes the agent operations; canvas renderers (`plugin-tldraw`,
`plugin-excalidraw`, `react-ui-canvas`) each supply a `ContentHandler` for their record encoding.
