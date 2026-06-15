# isomorphic-quickjs

Wrapper around `quickjs-emscripten` that works out-of-the box in browser (with vite) and node.

## Usage

```ts
import { createQuickJS } from '@dxos/vendor-quickjs';

const quickJS = await createQuickJS();
```
