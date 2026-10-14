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

| Mode  | Result                                                                                         |
| ----- | ---------------------------------------------------------------------------------------------- |
| serve | The `/@fs/` URL of the source file; the dev server compiles it (and its imports) on request.   |
| build | An emitted chunk (`preserveSignature: 'strict'`); its imports are bundled or shared chunks.    |

Types: add `/// <reference types="@dxos/vite-plugin-module-url/client" />` to a `.d.ts` in the consumer.

Shared chunks a module imports are evaluated in the importing realm, so they must not touch the DOM at
import time when that realm is a worker.
