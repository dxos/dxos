//
// Copyright 2020 DXOS.
//

// Not included in the main `index.ts` so that the apps are not bundled with it.
// It contains native Node functionality so must not be included in the final app bundle, only during compilation/bundling.

module.exports = require('./dist/src/plugin/ConfigPlugin');
