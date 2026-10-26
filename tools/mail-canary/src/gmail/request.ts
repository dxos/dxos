//
// Copyright 2026 DXOS.org
//

import * as Data from 'effect/Data';
import * as Effect from 'effect/Effect';
import * as Schedule from 'effect/Schedule';
import * as Schema from 'effect/Schema';

/** A failed Gmail or Google OAuth call. */
export class GmailError extends Data.TaggedError('GmailError')<{
  readonly message: string;
  readonly status?: number;
}> {}

/** One Google API call: retried on 429 and 5xx, its JSON body decoded with `schema`. */
export const request = <S extends Schema.Top>(
  schema: S,
  url: string,
  init: RequestInit = {},
): Effect.Effect<S['Type'], GmailError, S['DecodingServices']> =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url, init);
      // Read text first: a 5xx from Google's front end can be HTML, and its status must survive to the retry.
      const text = response.status === 204 ? '' : await response.text();
      if (!response.ok) {
        throw new GmailError({
          message: `${url} → ${response.status}: ${text.slice(0, 500)}`,
          status: response.status,
        });
      }
      const body: unknown = text ? JSON.parse(text) : {};
      return body;
    },
    catch: (cause) => (cause instanceof GmailError ? cause : new GmailError({ message: String(cause) })),
  }).pipe(
    // Gmail answers a burst over the per-user quota with 429 and the odd 5xx; both clear on their own.
    Effect.retry({
      while: (error) => error.status === 429 || (error.status ?? 0) >= 500,
      schedule: Schedule.exponential('1 second'),
      times: 6,
    }),
    Effect.flatMap((body) =>
      Schema.decodeUnknownEffect(schema)(body).pipe(
        Effect.mapError((error) => new GmailError({ message: `unexpected response from ${url}: ${error.message}` })),
      ),
    ),
  );
