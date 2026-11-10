//
// Copyright 2026 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { openBrowser } from '#platform';

export type PresentUrlOptions = {
  /** Line printed above the link. */
  readonly message?: string;
  /** Also open the link in the default browser. Defaults to true. */
  readonly open?: boolean;
};

/**
 * Prints a link the user must visit, then opens it in the default browser unless `open` is false.
 * The link is printed first and always, so it can go to another browser or profile than the default.
 */
export const presentUrl = (
  url: string,
  { message = 'Open this link in your browser:', open = true }: PresentUrlOptions = {},
): Effect.Effect<void> =>
  Effect.gen(function* () {
    yield* Console.log(`${message}\n\n  ${url}\n`);
    if (open) {
      yield* openBrowser(url).pipe(Effect.catch(() => Effect.void));
    }
  });
