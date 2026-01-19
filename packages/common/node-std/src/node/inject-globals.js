//
// Copyright 2022 DXOS.org
//

// To be used with esbuild's inject option.
// In Node.js, these globals are already available, so we just re-export them.

import { Buffer } from 'node:buffer';
import process from 'node:process';

const global = globalThis;

// Keep in sync with packages/common/esbuild-plugins/src/node-external-plugin.ts
export { global, Buffer, process };
