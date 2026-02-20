//
// Copyright 2025 DXOS.org
//

import { type Obj } from '@dxos/echo';

// TODO: use URL scheme for source?
export const FUNCTIONS_META_KEY = 'dxos.org/service/function';

export const FUNCTIONS_PRESET_META_KEY = 'dxos.org/service/function-preset';

/**
 * NOTE: functionId is backend ID, not ECHO object id.
 */
export const getUserFunctionIdInMetadata = (meta: Obj.ReadonlyMeta) => {
  return meta.keys.find((key) => key.source === FUNCTIONS_META_KEY)?.id;
};

/**
 * NOTE: functionId is backend ID, not ECHO object id.
 * Must be called inside Obj.changeMeta() since it mutates the meta.
 */
export const setUserFunctionIdInMetadata = (meta: Obj.Meta, functionId: string) => {
  const key = meta.keys.find((key) => key.source === FUNCTIONS_META_KEY);
  if (key) {
    if (key.id !== functionId) {
      throw new Error('Metadata mismatch');
    }
  } else {
    meta.keys.push({ source: FUNCTIONS_META_KEY, id: functionId });
  }
};
