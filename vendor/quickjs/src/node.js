//
// Copyright 2025 DXOS.org
//

export * from 'quickjs-emscripten';

import { newQuickJSWASMModule, RELEASE_SYNC } from 'quickjs-emscripten';

export const createQuickJS = () => {
  return newQuickJSWASMModule(RELEASE_SYNC);
};
