//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as FetchHttpClient from 'effect/unstable/http/FetchHttpClient';

import * as Operation from '@dxos/compute/Operation';
import { Ref } from '@dxos/echo';
import * as InboxResolver from '@dxos/extractor-lib';
import * as Binding from '@dxos/plugin-connector/Binding';
import { runMailSync } from '@dxos/plugin-inbox/sync';

import { GoogleCredentials, GoogleMailApi } from '#services';
import { GoogleOperation } from '#types';

import { googleMailSyncProvider } from './sync-provider';

const handler = GoogleOperation.GoogleMailSync.pipe(
  Operation.withHandler(({ connection, priority, userId = 'me', label = 'all' }) =>
    Binding.syncAll({
      connection,
      priority,
      sync: (binding) =>
        // Layer stack, top-down: the provider needs GoogleMailApi + Resolver; GoogleMailApi.Live needs
        // the HTTP client + credentials. Chained `Layer.provide` reads as that dependency stack.
        runMailSync({ binding: Ref.make(binding) }).pipe(
          Effect.provide(
            googleMailSyncProvider({ userId, label }).pipe(
              Layer.provide(InboxResolver.Live),
              Layer.provide(GoogleMailApi.Live),
              Layer.provide(FetchHttpClient.layer),
              Layer.provide(GoogleCredentials.fromAccessToken(binding.spec.source)),
            ),
          ),
          Effect.withSpan('google-sync'),
        ),
    }).pipe(
      Effect.map(({ outputs }) => ({
        newMessages: outputs.reduce((total, output) => total + output.newMessages, 0),
      })),
    ),
  ),
  Operation.opaqueHandler,
);

export default handler;
