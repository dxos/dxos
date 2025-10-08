//
// Copyright 2025 DXOS.org
//

export * from 'quickjs-emscripten';

import { newQuickJSWASMModule, DEBUG_SYNC } from 'quickjs-emscripten';

export const createQuickJS = () => {
  return newQuickJSWASMModule(DEBUG_SYNC);
};
