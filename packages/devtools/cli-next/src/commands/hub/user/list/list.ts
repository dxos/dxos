//
// Copyright 2025 DXOS.org
//

import path from 'node:path';

import { Command } from '@effect/cli';
import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Config, Console, Effect, pipe } from 'effect';

import { withRetry } from '@dxos/edge-client';

import { ConfigService } from '../../../../services';
import { command } from '../../../dx';
import { Common } from '../../../options';

export const list = Command.make(
  'list',
  {
    apiKey: Common.apiKey,
  },
  ({ apiKey }) =>
    Effect.flatMap(command, ({ verbose }) =>
      Effect.gen(function* () {
        const config = yield* ConfigService;
        const baseUrl = config.values?.runtime?.services?.hub?.url ?? 'https://hub.dxos.network';
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

        const json = yield* Config.boolean('JSON').pipe(Config.withDefault(false));
        if (json) {
          return yield* Console.log(result);
        } else {
          // TODO(burdon): Output table. Look at @effect/printer.
          return yield* Console.log((result as any).profiles?.length + ' profiles');
        }
      }),
    ),
).pipe(Command.withDescription('List hub users.'));
