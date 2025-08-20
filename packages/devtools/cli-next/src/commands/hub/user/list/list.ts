//
// Copyright 2025 DXOS.org
//

import path from 'node:path';

import { Command } from '@effect/cli';
import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Config, Console, Effect, pipe } from 'effect';

import { withRetry } from '@dxos/edge-client';

import { ConfigService } from '../../../../services';

export const list = Command.make('list', {}, () =>
  Effect.gen(function* () {
    const config = yield* ConfigService;
    const baseUrl = config.values?.runtime?.services?.hub?.url ?? 'https://hub.dxos.network';
    const url = path.join(baseUrl, '/api/user/profile');
    const verbose = yield* Config.boolean('VERBOSE').pipe(Config.withDefault(false));
    if (verbose) {
      yield* Effect.log(`Calling: ${url}`);
    }

    const apiKey = yield* Config.string('DX_HUB_API_KEY');
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
).pipe(Command.withDescription('List hub users.'));
