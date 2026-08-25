---
'@dxos/plugin-markdown': minor
---

A plugin's entrypoint is now its `dxplugin.jsonc` descriptor rather than a TypeScript module.
`plugin-markdown` no longer exports `./MarkdownPlugin`; import the descriptor instead, which carries
`make` and `meta` alongside the data:

```ts
import * as MarkdownPlugin from '@dxos/plugin-markdown/dxplugin.jsonc';
```

A host that reads the descriptor without the `dxPluginManifest()` vite plugin gets the data only and
builds the plugin with `Plugin.fromManifest`. A library build also emits `dist/lib/dxplugin.json`,
with each module `src` pointing at the chunk that shipped, for hosts that fetch a published plugin.
