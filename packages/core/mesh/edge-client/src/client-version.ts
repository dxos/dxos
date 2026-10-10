//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';
import { EDGE_CLIENT_TOO_OLD, EDGE_CLIENT_VERSION_PARAM } from '@dxos/protocols';

import { version } from '../package.json';

/**
 * This SDK's version, which EDGE checks against the oldest it serves. It releases in lockstep with the rest of the
 * SDK, and Vite tree-shakes the import to this one field.
 */
export const CLIENT_SDK_VERSION: string = version;

/** EDGE refused this SDK as older than the oldest it serves; only reloading the app to a newer build clears it. */
export class ClientTooOldError extends BaseError.extend(
  'ClientTooOldError',
  'This app is too old to sync with EDGE; reload it to update.',
) {}

/**
 * `url` advertising {@link CLIENT_SDK_VERSION}. Every request of the EDGE connect flow goes through this, so the
 * `/auth` challenge, its 401 fallback and the WebSocket upgrade all carry the version in the same form.
 */
// TODO(mykola): Send it on every EDGE request once the AI proxy stops forwarding the query string upstream.
export const withClientVersion = (url: URL): URL => {
  const versioned = new URL(url);
  versioned.searchParams.set(EDGE_CLIENT_VERSION_PARAM, CLIENT_SDK_VERSION);
  return versioned;
};

/**
 * Throws {@link ClientTooOldError} when `response` is EDGE's 426 refusing this SDK. Matched on the body's type, as any
 * WebSocket endpoint answers a plain GET with a bare 426 "Upgrade Required".
 */
export const assertClientSupported = async (response: Response): Promise<void> => {
  if (response.status !== 426) {
    return;
  }
  const body = await response
    .clone()
    .json()
    .catch(() => undefined);
  if (body?.data?.type !== EDGE_CLIENT_TOO_OLD) {
    return;
  }
  throw new ClientTooOldError({
    context: { version: CLIENT_SDK_VERSION, minimumVersion: body?.data?.minimumVersion, reason: body?.message },
  });
};
