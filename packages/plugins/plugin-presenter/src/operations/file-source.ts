//
// Copyright 2026 DXOS.org
//

import type * as FileOperation from '@dxos/plugin-file/FileOperation';

type FileSource = typeof FileOperation.FileSource.Type;

// `data:<type>[;param]*,<payload>`; the payload is base64 when a parameter says so, else percent-encoded text.
const DATA_URL = /^data:([^;,]*)((?:;[^;,]*)*),(.*)$/s;

const bytesToBase64 = (bytes: Uint8Array): string =>
  btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''));

/**
 * A generated image's URL as a source plugin-file can store: a `data:` URL's bytes inline (base64), or an `https:` URL
 * for it to fetch; anything else (a `blob:` URL, say) has no bytes a host can reach, so it is not stored.
 */
export const toFileSource = (url: string): FileSource | undefined => {
  const match = DATA_URL.exec(url);
  if (match) {
    const [, mediaType, params, payload] = match;
    const data = params.split(';').includes('base64')
      ? payload
      : bytesToBase64(new TextEncoder().encode(decodeURIComponent(payload)));
    return { type: 'base64', mediaType: mediaType || 'application/octet-stream', data };
  }

  return url.startsWith('https://') ? { type: 'http', url } : undefined;
};
