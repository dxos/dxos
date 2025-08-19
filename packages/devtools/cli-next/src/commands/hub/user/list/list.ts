//
// Copyright 2025 DXOS.org
//

import { Command } from '@effect/cli';
import { FetchHttpClient, HttpClient } from '@effect/platform';
import { Console, Effect, pipe } from 'effect';

import { withRetry } from '@dxos/edge-client';

import { Common } from '../../../options';

export const list = Command.make(
  'list',
  {
    json: Common.json,
  },
  Effect.fn(function* ({ json }) {
    const result = yield* pipe(
      withRetry(HttpClient.get('https://postman-echo.com/get?foo=bar')),
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
