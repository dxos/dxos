//
// Copyright 2025 DXOS.org
//

import path from 'node:path';

import * as Command from '@effect/cli/Command';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as HttpClient from '@effect/platform/HttpClient';
import * as Config from 'effect/Config';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { ConfigService } from '@dxos/client';
import { withRetry } from '@dxos/edge-client';

import { CommandConfig } from '../../../../services';

export const list = Command.make(
  'list',
  {},
  Effect.fn(function* () {
    const config = yield* ConfigService;
    const baseUrl = config.values?.runtime?.services?.hub?.url ?? 'https://hub.dxos.network';
    const url = path.join(baseUrl, '/api/user/profile');
    if (yield* CommandConfig.isVerbose) {
      yield* Effect.log(`Calling: ${url}`);
    }

    const apiKey = yield* Config.string('DX_HUB_API_KEY');
    const result = yield* Function.pipe(
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

    if (yield* CommandConfig.isJson) {
      return yield* Console.log(result);
    } else {
      // TODO(burdon): Output table. Look at @effect/printer.
      return yield* Console.log((result as any).profiles?.length + ' profiles');
    }
  }),
).pipe(Command.withDescription('List hub users.'));
