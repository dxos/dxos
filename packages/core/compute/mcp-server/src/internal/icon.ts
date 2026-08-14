//
// Copyright 2026 DXOS.org
//

import { ICON_DARK_BASE64, ICON_LIGHT_BASE64, ICON_SIZE } from './icon-data';

/**
 * The mark, for a host that can serve it. Kept apart from {@link identity} because only an HTTP
 * host has an origin to serve an icon from — a stdio host advertises the name and title and never
 * reaches this module, so the embedded bytes stay out of its bundle.
 */

/** Paths a host serves the embedded mark from; referenced by the advertised icon URIs. */
export const ICON_LIGHT_PATH = '/icon-light.png';
export const ICON_DARK_PATH = '/icon-dark.png';

/**
 * Icon descriptors for `serverInfo`, absolute against the origin the client actually reached.
 *
 * The specification directs clients to verify that an icon URI is same-origin as the server and to
 * fetch it without credentials, so the origin must be the external one — which is not the origin a
 * worker sees when TLS terminates in front of it.
 */
export const icons = (origin: string) => {
  const sizes = [`${ICON_SIZE}x${ICON_SIZE}`];
  return [
    // The mark is monochrome, so each variant declares the background it suits. A client that
    // ignores `theme` still gets a usable icon from the first entry.
    { src: `${origin}${ICON_LIGHT_PATH}`, mimeType: 'image/png', sizes, theme: 'light' },
    { src: `${origin}${ICON_DARK_PATH}`, mimeType: 'image/png', sizes, theme: 'dark' },
  ];
};

/**
 * Serves the embedded mark. Returns undefined for any other path so the caller can fall through.
 *
 * Immutable and long-lived: the bytes are baked into the bundle, so a change ships as a new
 * deployment rather than a new body at the same URL.
 */
export const iconResponse = (pathname: string): Response | undefined => {
  const base64 =
    pathname === ICON_LIGHT_PATH ? ICON_LIGHT_BASE64 : pathname === ICON_DARK_PATH ? ICON_DARK_BASE64 : undefined;
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
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=86400, immutable',
      // Icons are fetched cross-origin by clients rendering them.
      'Access-Control-Allow-Origin': '*',
    },
  });
};
