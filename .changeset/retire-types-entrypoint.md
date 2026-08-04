---
'@dxos/plugin-assistant': major
'@dxos/plugin-attention': major
'@dxos/plugin-board': major
'@dxos/plugin-calls': major
'@dxos/plugin-chess': major
'@dxos/plugin-client': major
'@dxos/plugin-conductor': major
'@dxos/plugin-connector': major
'@dxos/plugin-debug': major
'@dxos/plugin-deck': major
'@dxos/plugin-devtools': major
'@dxos/plugin-explorer': major
'@dxos/plugin-file': major
'@dxos/plugin-game': major
'@dxos/plugin-illustrator': major
'@dxos/plugin-inbox': major
'@dxos/plugin-kanban': major
'@dxos/plugin-magazine': major
'@dxos/plugin-map': major
'@dxos/plugin-markdown': major
'@dxos/plugin-native': major
'@dxos/plugin-navtree': major
'@dxos/plugin-observability': major
'@dxos/plugin-outliner': major
'@dxos/plugin-pipeline': major
'@dxos/plugin-presenter': major
'@dxos/plugin-review': major
'@dxos/plugin-routine': major
'@dxos/plugin-script': major
'@dxos/plugin-search': major
'@dxos/plugin-settings': major
'@dxos/plugin-sheet': major
'@dxos/plugin-simple-layout': major
'@dxos/plugin-space': major
'@dxos/plugin-stack': major
'@dxos/plugin-table': major
'@dxos/plugin-template': major
'@dxos/plugin-testing': major
'@dxos/plugin-thread': major
'@dxos/plugin-tldraw': major
'@dxos/plugin-transcription': major
'@dxos/plugin-voxel': major
'@dxos/plugin-wnfs': major
---

Retire the `/types` aggregate entrypoint in favour of the per-namespace subpaths.

`@dxos/plugin-*/types` re-exported every namespace of a plugin from one module, so a
single import statically pulled in all of them. These are Effect/ECHO schemas — runtime
values rather than erased types — so the aggregate defeated the per-namespace subpaths
it sat alongside and kept the plugin's whole schema graph in the eager module graph.

Breaking: the `./types` export is removed from every plugin that published it. Import the
namespace you need instead — `@dxos/plugin-chess/Chess` rather than
`@dxos/plugin-chess/types`. The `dxos-subpath-imports` lint rule autofixes call sites.

Plugins whose barrel mixed namespaces with flat exports gained real modules for those
exports (`ConnectorAnnotations`, `SettingsPath`, `AssistantOptions`, `SpaceSchema`, and
others); plugin-client and plugin-space additionally had their `export namespace X` wrappers
unwrapped, so `X.X.member` becomes `X.member`.
