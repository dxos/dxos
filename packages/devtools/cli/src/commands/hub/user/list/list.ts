//
// Copyright 2025 DXOS.org
//

import * as Config from 'effect/Config';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Command from 'effect/unstable/cli/Command';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';
import * as HttpClient from 'effect/unstable/http/HttpClient';
import path from 'node:path';

import { CommandConfig } from '@dxos/cli-util';
import { withRetry } from '@dxos/edge-client';

import { formatHubError, hubBaseUrl } from '../../util';

export const list = Command.make(
  'list',
  {},
  Effect.fn(function* () {
    const baseUrl = yield* hubBaseUrl;
    const url = path.join(baseUrl, '/api/waitlist');
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
      // Same surfacing as the sibling hub commands: a transport/API failure reaches the user as the
      // hub's own message, not a raw Effect error dump.
      Effect.catch((error) => Effect.fail(new Error(formatHubError(error)))),
    );

    if (yield* CommandConfig.isJson) {
      return yield* Console.log(result);
    } else {
      // TODO(burdon): Output table. Look at @effect/printer.
      const count = countEntries(result);
      return yield* Console.log(count === undefined ? 'Unexpected response.' : `${count} waitlist entries`);
    }
  }),
).pipe(Command.withDescription('List hub users.'));

/** Narrows the untyped hub response; `undefined` when it does not carry an `entries` array. */
const countEntries = (result: unknown): number | undefined =>
  typeof result === 'object' && result !== null && 'entries' in result && Array.isArray(result.entries)
    ? result.entries.length
    : undefined;
