//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { BaseError } from '@dxos/errors';

/** The drawing app, which opens a shared diagram as an editable canvas; a dev build may point at a local one. */
export const DRAWING_APP_URL = import.meta.env.VITE_DRAWING_APP_URL ?? 'https://app.drawing.sh';

export class ShareError extends BaseError.extend('ShareError', 'The drawing could not be shared') {}

/** Stores the editor's `.dx` source with the drawing app's share API and returns the `?d=<id>` link to open. */
export const shareSource: (text: string, name: string) => Effect.Effect<string, ShareError> = Effect.fn('shareSource')(
  function* (text: string, name: string) {
    const endpoint = new URL('/api/share', DRAWING_APP_URL);
    endpoint.searchParams.set('name', name);
    const response = yield* Effect.tryPromise({
      try: () => fetch(endpoint, { method: 'POST', body: text, headers: { 'Content-Type': 'text/plain' } }),
      catch: (cause) => new ShareError({ message: 'Could not reach app.drawing.sh.', cause }),
    });
    const body = yield* Effect.tryPromise({
      try: () => response.text(),
      catch: (cause) => new ShareError({ message: 'Could not read the reply from app.drawing.sh.', cause }),
    });
    if (!response.ok) {
      return yield* Effect.fail(new ShareError({ message: `app.drawing.sh refused the drawing: ${body}` }));
    }
    const value: unknown = yield* Effect.try({
      try: () => JSON.parse(body),
      catch: (cause) => new ShareError({ message: 'Unexpected reply from app.drawing.sh.', cause }),
    });
    // The link is built on the origin posted to, which a local `wrangler dev` reports as its route's host instead.
    if (typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string') {
      return new URL(`/?d=${encodeURIComponent(value.id)}`, DRAWING_APP_URL).href;
    }
    return yield* Effect.fail(new ShareError({ message: 'Unexpected reply from app.drawing.sh.' }));
  },
);
