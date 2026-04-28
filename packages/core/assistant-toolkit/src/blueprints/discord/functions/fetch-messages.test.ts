//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { describe, it } from '@effect/vitest';
import * as Config from 'effect/Config';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { AssistantTestLayer } from '@dxos/functions-runtime/testing';
import { TestHelpers } from '@dxos/effect/testing';
import { CredentialsService } from '@dxos/functions';
import { Operation, OperationHandlerSet } from '@dxos/operation';

import { default as fetchMessages } from './fetch-messages';

const TestLayer = AssistantTestLayer({
  operationHandlers: OperationHandlerSet.make(fetchMessages),
});

const TestLayerWithCredentials = Layer.mergeAll(
  CredentialsService.layerConfig([{ service: 'discord.com', apiKey: Config.redacted('DISCORD_TOKEN') }]),
  FetchHttpClient.layer,
).pipe(Layer.provideMerge(TestLayer));

const DXOS_SERVER_ID = '837138313172353095';

describe('Feed', { timeout: 600_000 }, () => {
  it.effect(
    'fetch discord messages',
    Effect.fnUntraced(
      function* (_) {
        const messages = yield* Operation.invoke(fetchMessages, {
          serverId: DXOS_SERVER_ID,
          last: '7d',
        }).pipe(Effect.orDie);
        console.log(messages);
      },
      Effect.provide(TestLayerWithCredentials),
      TestHelpers.provideTestContext,
      TestHelpers.taggedTest('sync'),
    ),
  );
});
