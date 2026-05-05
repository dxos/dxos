//
// Copyright 2026 DXOS.org
//

// `kbn-handlebars` is published as CommonJS-with-`__esModule`. esbuild's `__toESM`
// helper (in Node-compatibility mode, which it uses by default) hands us the entire
// `module.exports` as the synthetic default — i.e. `{ default: <real Handlebars>,
// compileFnName }` — rather than the inner `default`. We unwrap once here so the
// bundle exports the patched Handlebars singleton (with `.create()`, `.compileAST()`,
// `.registerHelper()`) directly to consumers.
import kbnExports from 'kbn-handlebars';

const Handlebars = kbnExports.default ?? kbnExports;

export default Handlebars;
export const compileFnName = kbnExports.compileFnName ?? Handlebars?.compileFnName;
