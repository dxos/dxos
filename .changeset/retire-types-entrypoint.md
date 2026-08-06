---
'@dxos/plugin-markdown': minor
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
