/* eslint-disable */

//
// Copyright 2021 DXOS.org
//

// Not included in the main `index.ts` so that the apps are not bundled with it.
// It contains native Node functionality so must not be included in the final app bundle, only during compilation/bundling.

export * from './dist/plugin/node-esm/plugins/plugin.mjs';
