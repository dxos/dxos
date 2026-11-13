---
'@dxos/app-framework': patch
---

The `@dxos` packages now work in an app outside this monorepo, such as a StackBlitz project. `@dxos/effect` lists `@opentelemetry/resources` and `@opentelemetry/semantic-conventions` as dependencies, `@dxos/react-ui-graph` inlines its patched `js-clipper`, `ThemePlugin()` needs no options, and `@dxos/vite-plugin-icons` is published. In dev, `@dxos/app-framework`'s Vite plugins load a plugin from the host's own dev server: a bare module specifier resolves through the host's import map, each import-map wrapper re-exports `default`, and `importMapPlugin` takes an `onImportMap` callback that receives the finished map.
