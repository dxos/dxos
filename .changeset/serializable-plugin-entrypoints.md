---
'@dxos/app-framework': minor
'@dxos/plugin-markdown': minor
---

Plugin entrypoints can be declared as data. A plugin publishes a `dxplugin.jsonc` next to its
`package.json` carrying its metadata plus its module list — activation events, capability
requires/provides, and a relative URL per module file — and that descriptor replaces the plugin's
TypeScript entrypoint rather than sitting beside it. `plugin-markdown` no longer exports
`./MarkdownPlugin`; import the descriptor instead, which carries `make` and `meta` alongside the
data:

```ts
import * as MarkdownPlugin from '@dxos/plugin-markdown/dxplugin.jsonc';
```

The `dxPluginManifest()` vite plugin resolves it, serving module sources from the dev server in
development and emitting each as a build entrypoint (rewritten to the built asset) in production. A
library build also emits `dist/lib/dxplugin.json`, each module `src` pointing at the chunk that
shipped, so a host that fetches a published plugin needs neither vite nor a comment-tolerant parser.
Reading the descriptor raw yields the data alone, and the plugin is built with
`Plugin.fromManifest`.
