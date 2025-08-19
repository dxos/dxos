//
// Copyright 2025 DXOS.org
//

import path from 'node:path';

import { Command } from '@effect/cli';
import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Console, Effect, pipe } from 'effect';

import { withRetry } from '@dxos/edge-client';

// TODO(burdon): Circular dep.
// import { dx } from '../../../dx';
import { ConfigService } from '../../../../services';
import { Common } from '../../../options';

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
    apiKey: Common.apiKey,
  },
  Effect.fn(function* ({ json, verbose, apiKey }) {
    const config = yield* ConfigService;
    const baseUrl = config.get('runtime.services.hub.url', 'https://hub.dxos.network') as string;
    const url = path.join(baseUrl, '/api/user/profile');
    if (verbose) {
      yield* Effect.log(`Calling: ${url}`);
    }

    const result = yield* pipe(
      withRetry(
        HttpClient.get(url, {
          headers: {
            'x-api-key': apiKey,
          },
        }),
      ),
      Effect.provide(FetchHttpClient.layer),
      Effect.withSpan('EdgeHttpClient'),
    );

    if (json) {
      return yield* Console.log(result);
    } else {
      return yield* Console.log('ok');
    }
  }),
).pipe(Command.withDescription('List Hub users.'));
