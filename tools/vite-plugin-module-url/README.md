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

| Mode  | Result                                                                                        |
| ----- | --------------------------------------------------------------------------------------------- |
| serve | The `/@fs/` URL of the source file; the dev server compiles it (and its imports) on request.  |
| build | A self-contained bundle with its exports kept, or an entry of its host worker's build (below). |

Types: add `/// <reference types="@dxos/vite-plugin-module-url/client" />` to a `.d.ts` in the consumer.

The build needs the plugin in `worker.plugins` too, and `worker.format: 'es'`.

## Sharing modules with a worker

A self-contained bundle carries its own copy of every module it imports, so loaded into a worker it does
not share module-level state (class identities, symbols, registries) with the worker's entry. To share
it, host the module in that worker's build:

```ts
const options = { workers: { 'src/worker.ts': ['src/plugins/a.ts', 'src/plugins/b.ts'] } };
// Both instances: the top-level one resolves the URLs, the `worker.plugins` one builds them.
export default defineConfig({ plugins: [ModuleUrlPlugin(options)], worker: { format: 'es', plugins: () => [ModuleUrlPlugin(options)] } });
```

Each hosted module becomes an extra entry chunk of the worker's own build (the one Vite runs for
`new Worker(new URL('./worker.ts', import.meta.url))`), so it imports the chunks the worker entry
imports. Vite copies that build's files into the importing build, and the module's URL is filled in
when the importing chunk renders.
