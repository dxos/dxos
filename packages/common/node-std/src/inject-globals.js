//
// Copyright 2022 DXOS.org
//

// To be used with esbuild's inject option.

import { Buffer } from 'buffer/';

import { process } from './process';

const global = globalThis;

// Keep in sync with packages/common/esbuild-plugins/src/node-external-plugin.ts
export { global, Buffer, process };
