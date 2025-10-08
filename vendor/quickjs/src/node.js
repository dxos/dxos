//
// Copyright 2025 DXOS.org
//

export * from 'quickjs-emscripten';

import { getQuickJS } from 'quickjs-emscripten';

export const createQuickJS = () => {
  return getQuickJS();
};
