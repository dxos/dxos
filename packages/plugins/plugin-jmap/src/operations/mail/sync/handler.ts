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

import { JmapCredentials, JmapMailApi } from '#services';
import { JmapOperation } from '#types';

import { jmapMailSyncProvider } from './sync-provider';

const handler = JmapOperation.JmapSync.pipe(
  Operation.withHandler(({ connection, priority }) =>
    Binding.syncAll({
      connection,
      priority,
      sync: (binding) =>
        // Layer stack, top-down: the provider needs JmapMailApi + Resolver; JmapMailApi.Live needs the
        // HTTP client + credentials. Chained `Layer.provide` reads as that dependency stack.
        runMailSync({ binding: Ref.make(binding) }).pipe(
          Effect.provide(
            jmapMailSyncProvider().pipe(
              Layer.provide(InboxResolver.Live),
              Layer.provide(JmapMailApi.Live),
              Layer.provide(FetchHttpClient.layer),
              Layer.provide(JmapCredentials.fromAccessToken(binding.spec.source)),
            ),
          ),
          Effect.withSpan('jmap-sync'),
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
