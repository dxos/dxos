// Copyright 2026 DXOS.org

import { defineConfig } from '../../../tsdown.base.config.ts';

export default defineConfig({
  entry: ["src/_/config.js","src/assert.js","src/buffer.js","src/crypto.js","src/events.js","src/fs.js","src/fs/promises.js","src/globals.js","src/inject-globals.js","src/path.js","src/process.js","src/stream.js","src/util.js"],
  platform: ["browser"],
  bundlePackages: ["assert","available-typed-arrays","base64-js","buffer","call-bind","call-bind-apply-helpers","call-bound","define-data-property","define-properties","dunder-proto","es-abstract","es-define-property","es-errors","es-object-atoms","es6-object-assign","events","for-each","function-bind","get-intrinsic","get-proto","gopd","has","has-property-descriptors","has-proto","has-symbols","has-tostringtag","hasown","ieee754","inherits","is-arguments","is-callable","is-generator-function","is-nan","is-typed-array","math-intrinsics","object-is","object-keys","object.assign","path-browserify","possible-typed-array-names","set-function-length","string_decoder","util","util-deprecate","which-typed-array"],
});
