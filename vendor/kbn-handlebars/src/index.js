//
// Copyright 2026 DXOS.org
//

// `kbn-handlebars` is published as CommonJS-with-`__esModule` (its compiled `module.exports`
// looks like `{ default: Handlebars, compileFnName, __esModule: true }`). Node's ESM-CJS
// interop and workerd both expose the entire `module.exports` as the synthetic ESM default —
// they do *not* honour the `__esModule` marker. As a result, `import H from 'kbn-handlebars'`
// hands us the namespace object rather than the `Handlebars` instance, and `H.create` is
// `undefined`.
//
// We unwrap the inner default here so downstream consumers can always do
// `import Handlebars from '@dxos/vendor-kbn-handlebars'` and call `Handlebars.create()`.
// The `?? cjs` fallback covers bundlers (e.g. esbuild with synthetic-default-imports) that
// already perform the unwrap.
import cjs from 'kbn-handlebars';

const handlebars = cjs?.default ?? cjs;

export default handlebars;
export const compileFnName = cjs?.compileFnName ?? handlebars?.compileFnName;
