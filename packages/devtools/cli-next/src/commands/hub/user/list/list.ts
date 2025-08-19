//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Console, Effect, pipe } from 'effect';

import { withRetry } from '@dxos/edge-client';

import { Common } from '../../../options';

// TODO(burdon): Circular dep.
// import { dx } from '../../../dx';

// export const list = Command.make(
//   'list',
//   {
//     json: Common.json,
//   },
//   ({ json }) =>
//     Effect.flatMap(dx, ({ verbose }) =>
//       Effect.gen(function* () {
//         const url = 'https://postman-echo.com/get?foo=bar';
//         if (verbose) {
//           yield* Effect.log(`Calling: ${url}`);
//         }
//
//         const result = yield* pipe(
//           withRetry(HttpClient.get(url)),
//           Effect.provide(FetchHttpClient.layer),
//           Effect.withSpan('EdgeHttpClient'),
//         );
//
//         if (json) {
//           return yield* Console.log(result);
//         } else {
//           return yield* Console.log('ok');
//         }
//       }),
//     ),
// ).pipe(Command.withDescription('List hub users.'));

export const list = Command.make(
  'list',
  {
    json: Common.json,
    verbose: Common.verbose,
  },
  Effect.fn(function* ({ json, verbose }) {
    const url = 'https://postman-echo.com/get?foo=bar';
    if (verbose) {
      yield* Effect.log(`Calling: ${url}`);
    }

    const result = yield* pipe(
      withRetry(HttpClient.get(url)),
      Effect.provide(FetchHttpClient.layer),
      Effect.withSpan('EdgeHttpClient'),
    );

    if (json) {
      return yield* Console.log(result);
    } else {
      return yield* Console.log('ok');
    }
  }),
).pipe(Command.withDescription('List hub users.'));
