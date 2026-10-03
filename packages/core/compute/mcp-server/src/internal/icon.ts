//
// Copyright 2026 DXOS.org
//

import { FAVICON_BASE64, ICON_BASE64, ICON_SIZE } from './icon-data.ts';

/**
 * The mark, for a host that can serve it. Kept apart from {@link identity} because only an HTTP
 * host has an origin to serve an icon from — a stdio host advertises the name and title and never
 * reaches this module, so the embedded bytes stay out of its bundle.
 */

/** Paths a host serves the embedded mark from; referenced by the advertised icon URIs. */
export const ICON_PATH = '/icon.png';
export const FAVICON_PATH = '/favicon.ico';

/**
 * Icon descriptors for `serverInfo`, absolute against the origin the client actually reached.
 *
 * The specification directs clients to verify that an icon URI is same-origin as the server and to
 * fetch it without credentials, so the origin must be the external one — which is not the origin a
 * worker sees when TLS terminates in front of it.
 */
export const icons = (origin: string) => [
  { src: `${origin}${ICON_PATH}`, mimeType: 'image/png', sizes: [`${ICON_SIZE}x${ICON_SIZE}`] },
];

/**
 * Serves the embedded mark, and the same mark as the origin's favicon because some clients (claude.ai
 * among them) brand a connector by its domain's favicon rather than by `serverInfo.icons`. Returns
 * undefined for any other path so the caller can fall through.
 *
 * Long-lived but not immutable: the paths are fixed, so a changed mark must replace the cached one.
 */
export const iconResponse = (pathname: string): Response | undefined => {
  const [base64, contentType] =
    pathname === ICON_PATH
      ? [ICON_BASE64, 'image/png']
      : pathname === FAVICON_PATH
        ? [FAVICON_BASE64, 'image/x-icon']
        : [undefined, undefined];
  if (!base64) {
    return undefined;
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Response(bytes, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
      // Icons are fetched cross-origin by clients rendering them.
      'Access-Control-Allow-Origin': '*',
    },
  });
};
