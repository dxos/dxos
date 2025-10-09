//
// Copyright 2025 DXOS.org
//

import { type ObjectMeta } from '@dxos/echo/internal';
import { type SpaceId } from '@dxos/keys';

// TODO: use URL scheme for source?
export const FUNCTIONS_META_KEY = 'dxos.org/service/function';

export const FUNCTIONS_PRESET_META_KEY = 'dxos.org/service/function-preset';

const isSecure = (protocol: string) => {
  return protocol === 'https:' || protocol === 'wss:';
};

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

/**
 * NOTE: functionId is backend ID, not ECHO object id.
 */
export const getInvocationUrl = (functionId: string, edgeUrl: string, options: InvocationOptions = {}) => {
  const baseUrl = new URL('functions/', edgeUrl);

  // Leading slashes cause the URL to be treated as an absolute path.
  const url = new URL(`./${functionId}`, baseUrl.toString());
  options.spaceId && url.searchParams.set('spaceId', options.spaceId);
  options.subjectId && url.searchParams.set('subjectId', options.subjectId);
  url.protocol = isSecure(url.protocol) ? 'https' : 'http';
  return url.toString();
};

export type InvocationOptions = {
  spaceId?: SpaceId;
  subjectId?: string;
};
