//
// Copyright 2026 DXOS.org
//

import {
  EDGE_CLIENT_TOO_OLD,
  EDGE_CLIENT_VERSION_HEADER,
  EDGE_CLIENT_VERSION_PROTOCOL_PREFIX,
  EdgeClientTooOldError,
  type EdgeFailure,
} from '@dxos/protocols';

import { version } from '../package.json';

/**
 * This SDK's version, which EDGE checks against the oldest it serves. It releases in lockstep with the rest of the
 * SDK, and Vite tree-shakes the import to this one field.
 */
export const CLIENT_SDK_VERSION: string = version;

/** Headers advertising {@link CLIENT_SDK_VERSION} on a request of the EDGE connect flow (`/auth` and its fallback). */
export const clientVersionHeaders = (): Record<string, string> => ({
  [EDGE_CLIENT_VERSION_HEADER]: CLIENT_SDK_VERSION,
});

/** The same advertisement for the WebSocket upgrade, where a browser can set no header but the subprotocol list. */
export const clientVersionProtocol = (): string => `${EDGE_CLIENT_VERSION_PROTOCOL_PREFIX}${CLIENT_SDK_VERSION}`;

/**
 * Throws {@link EdgeClientTooOldError} when `response` is EDGE's failure envelope refusing this SDK. Matched on the
 * envelope's `data.type`, as any WebSocket endpoint answers a plain GET with a bare 426 "Upgrade Required".
 */
export const assertClientSupported = async (response: Response): Promise<void> => {
  if (response.ok || !response.headers.get('Content-Type')?.startsWith('application/json')) {
    return;
  }
  const body: EdgeFailure | undefined = await response
    .clone()
    .json()
    .catch(() => undefined);
  if (body?.success === false && body.data?.type === EDGE_CLIENT_TOO_OLD) {
    throw new EdgeClientTooOldError(body, response.status);
  }
};
