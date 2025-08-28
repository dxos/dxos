//
// Copyright 2025 DXOS.org
//

import { type ObjectMeta } from '@dxos/echo-schema';
import { type SpaceId } from '@dxos/keys';

// TODO: use URL scheme for source?
export const FUNCTIONS_META_KEY = 'dxos.org/service/function';

export const FUNCTIONS_PRESET_META_KEY = 'dxos.org/service/function-preset';

const isSecure = (protocol: string) => {
  return protocol === 'https:' || protocol === 'wss:';
};

export const getUserFunctionUrlInMetadata = (meta: ObjectMeta) => {
  return meta.keys.find((key) => key.source === FUNCTIONS_META_KEY)?.id;
};

export const setUserFunctionUrlInMetadata = (meta: ObjectMeta, functionUrl: string) => {
  const key = meta.keys.find((key) => key.source === FUNCTIONS_META_KEY);
  if (key) {
    if (key.id !== functionUrl) {
      throw new Error('Metadata mismatch');
    }
  } else {
    meta.keys.push({ source: FUNCTIONS_META_KEY, id: functionUrl });
  }
};

/**
 * NOTE: functionId is backend ID, not ECHO object id.
 */
export const makeFunctionUrl = (fn: { functionId: string }) => `/${fn.functionId}`;

export const getInvocationUrl = (functionUrl: string, edgeUrl: string, options: InvocationOptions = {}) => {
  const baseUrl = new URL('functions/', edgeUrl);

  // Leading slashes cause the URL to be treated as an absolute path.
  const relativeUrl = functionUrl.replace(/^\//, '');
  const url = new URL(`./${relativeUrl}`, baseUrl.toString());
  options.spaceId && url.searchParams.set('spaceId', options.spaceId);
  options.subjectId && url.searchParams.set('subjectId', options.subjectId);
  url.protocol = isSecure(url.protocol) ? 'https' : 'http';
  return url.toString();
};

export type InvocationOptions = {
  spaceId?: SpaceId;
  subjectId?: string;
};
