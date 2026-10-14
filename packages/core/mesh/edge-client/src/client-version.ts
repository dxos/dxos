//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import {
  EDGE_CLIENT_TOO_OLD,
  EDGE_CLIENT_VERSION_HEADER,
  EDGE_CLIENT_VERSION_PROTOCOL_PREFIX,
  EdgeClientTooOldError,
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

const isClientTooOld = Schema.is(
  Schema.Struct({
    success: Schema.Literal(false),
    message: Schema.String,
    data: Schema.Struct({ type: Schema.Literal(EDGE_CLIENT_TOO_OLD) }),
  }),
);

export const readJsonBody = (response: Response): Promise<unknown> => response.json().catch(() => undefined);

/**
 * Throws {@link EdgeClientTooOldError} when `body` is a failed `response`'s EDGE envelope refusing this SDK. Matched on
 * the envelope's `data.type`, as any WebSocket endpoint answers a plain GET with a bare 426 "Upgrade Required".
 */
export const assertClientSupported = (response: Response, body: unknown): void => {
  if (!response.ok && isClientTooOld(body)) {
    throw new EdgeClientTooOldError(body, response.status);
  }
};
