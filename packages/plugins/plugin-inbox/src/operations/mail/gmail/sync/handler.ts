//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import * as InboxResolver from '@dxos/extractor-lib';
import { Cursor } from '@dxos/link';

import { GoogleCredentials, GoogleMailApi } from '../../../../services';
import { InboxOperation } from '../../../../types';
import { runMailSync } from '../../mail-sync';
import { gmailMailSyncProvider } from './sync-provider';

const handler = InboxOperation.GoogleMailSync.pipe(
  Operation.withHandler(({ binding: bindingRef, userId = 'me', label = 'all' }) =>
    Effect.gen(function* () {
      const bindingObj = bindingRef.target;
      if (!bindingObj || !Obj.getDatabase(bindingObj) || !Cursor.isExternal(bindingObj)) {
        return { newMessages: 0 };
      }

      const accessTokenRef = bindingObj.spec.source;
      // Layer stack, top-down: the provider needs GoogleMailApi + Resolver; GoogleMailApi.Live needs
      // the HTTP client + credentials. Chained `Layer.provide` reads as that dependency stack.
      return yield* runMailSync({ binding: bindingRef }).pipe(
        Effect.provide(
          gmailMailSyncProvider({ userId, label }).pipe(
            Layer.provide(InboxResolver.Live),
            Layer.provide(GoogleMailApi.Live),
            Layer.provide(FetchHttpClient.layer),
            Layer.provide(GoogleCredentials.fromAccessToken(accessTokenRef)),
          ),
        ),
        Effect.withSpan('gmail-sync'),
      );
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
