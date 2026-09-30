# @dxos/vite-plugin-module-url

Resolves `import url from './module.ts?module-url'` to the absolute URL of that module compiled as a
standalone ES module with its exports preserved, so another realm (typically a worker) can `import()` it.

```ts
import mathUrl from './modules/math.ts?module-url';

worker.postMessage({ moduleUrls: [mathUrl] }); // Worker side: `await import(url)`.
```

Vite has no built-in for this:

- `new URL('./x.ts', import.meta.url)` and `?url` copy the raw, uncompiled source as an asset.
- `?worker&url` compiles the file as a worker entry, whose exports a build tree-shakes away.

| Mode  | Result                                                                                              |
| ----- | --------------------------------------------------------------------------------------------------- |
| serve | The `/@fs/` URL of the source file, served as a module worker entry (Vite's `define` globals first). |
| build | A self-contained bundle with its exports kept, or an entry of the shared environment (below).       |

Types: add `/// <reference types="@dxos/vite-plugin-module-url/client" />` to a `.d.ts` in the consumer.

The build needs the plugin in `worker.plugins` too, and `worker.format: 'es'`.

## Sharing modules between URLs

Self-contained bundles each carry their own copy of every module they import, so two of them loaded into
one worker do not share module-level state (class identities, symbols, registries). To share it, list them
as entries of one environment:

```ts
ModuleUrlPlugin({
  environment: { name: 'worker', entries: ['src/worker.ts', 'src/plugins/a.ts', 'src/plugins/b.ts'] },
});
```

The environment is built before the client, as one graph with its exports kept: modules the entries have
in common become chunks they all import, and its files are emitted into the client's output. Every
top-level plugin also applies to the environment unless its `applyToEnvironment` excludes it. A worker
entry must itself be one of the entries, and started from its module URL:
`new Worker(workerUrl, { type: 'module' })`.
