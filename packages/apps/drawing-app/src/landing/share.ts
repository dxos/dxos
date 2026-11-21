//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';

/**
 * The host whose share API the page posts to: its own, whose Worker answers with a link on the app host. A dev
 * server has no Worker, so it may point at a local `wrangler dev`.
 */
const SHARE_HOST = import.meta.env.VITE_DRAWING_APP_URL ?? window.location.origin;

export class ShareError extends BaseError.extend('ShareError', 'The drawing could not be shared') {}

/** Stores the editor's `.dx` source with the share API and returns the `?d=<id>` link that opens it in the app. */
export const shareSource: (text: string, name: string) => Effect.Effect<string, ShareError> = Effect.fn('shareSource')(
  function* (text: string, name: string) {
    const endpoint = new URL('/api/share', SHARE_HOST);
    endpoint.searchParams.set('name', name);
    const response = yield* Effect.tryPromise({
      try: () => fetch(endpoint, { method: 'POST', body: text, headers: { 'Content-Type': 'text/plain' } }),
      catch: (cause) => new ShareError({ message: 'Could not reach the drawing.sh app.', cause }),
    });
    const body = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: (cause) => new ShareError({ message: 'Could not read the reply from the drawing.sh app.', cause }),
    });
    if (!response.ok) {
      return yield* Effect.fail(new ShareError({ message: `The drawing.sh app refused the drawing: ${body}` }));
    }
    const value: unknown = yield* Effect.try({
      try: () => JSON.parse(body),
      catch: (cause) => new ShareError({ message: 'Unexpected reply from the drawing.sh app.', cause }),
    });
    if (typeof value === 'object' && value !== null && 'url' in value && typeof value.url === 'string') {
      return value.url;
    }
    return yield* Effect.fail(new ShareError({ message: 'Unexpected reply from the drawing.sh app.' }));
  },
);
