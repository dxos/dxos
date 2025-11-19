//
// Copyright 2025 DXOS.org
//

import { type ObjectMeta } from '@dxos/echo/internal';

// TODO: use URL scheme for source?
export const FUNCTIONS_META_KEY = 'dxos.org/service/function';

export const FUNCTIONS_PRESET_META_KEY = 'dxos.org/service/function-preset';

/**
 * NOTE: functionId is backend ID, not ECHO object id.
 */
export const getUserFunctionIdInMetadata = (meta: ObjectMeta) => {
  return meta.keys.find((key) => key.source === FUNCTIONS_META_KEY)?.id;
};

/**
 * NOTE: functionId is backend ID, not ECHO object id.
 */
export const setUserFunctionIdInMetadata = (meta: ObjectMeta, functionId: string) => {
  const key = meta.keys.find((key) => key.source === FUNCTIONS_META_KEY);
  if (key) {
    if (key.id !== functionId) {
      throw new Error('Metadata mismatch');
    }
  } else {
    meta.keys.push({ source: FUNCTIONS_META_KEY, id: functionId });
  }
};
