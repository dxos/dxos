//
// Copyright 2025 DXOS.org
//

export * from 'quickjs-emscripten';

import { RELEASE_SYNC, newQuickJSWASMModule } from 'quickjs-emscripten';

export const createQuickJS = () => {
  return newQuickJSWASMModule(RELEASE_SYNC);
};
