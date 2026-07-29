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
import { log } from '@dxos/log';

import { JmapCredentials, JmapMailApi } from '../../../../services';
import { InboxOperation } from '../../../../types';
import { runMailSync } from '../../mail-sync';
import { jmapMailSyncProvider } from './sync-provider';

const handler = InboxOperation.JmapSync.pipe(
  Operation.withHandler(({ binding: bindingRef }) =>
    Effect.gen(function* () {
      const bindingObj = bindingRef.target;
      const db = bindingObj ? Obj.getDatabase(bindingObj) : undefined;
      if (!bindingObj || !db || !Cursor.isExternal(bindingObj)) {
        log.warn('jmap sync skipped: missing binding target or database', {
          hasBinding: Boolean(bindingObj),
          hasDatabase: Boolean(db),
        });
        return { newMessages: 0 };
      }

      const accessTokenRef = bindingObj.spec.source;
      // Layer stack, top-down: the provider needs JmapMailApi + Resolver; JmapMailApi.Live needs the
      // HTTP client + credentials. Chained `Layer.provide` reads as that dependency stack.
      return yield* runMailSync({ binding: bindingRef }).pipe(
        Effect.provide(
          jmapMailSyncProvider().pipe(
            Layer.provide(InboxResolver.Live),
            Layer.provide(JmapMailApi.Live),
            Layer.provide(FetchHttpClient.layer),
            Layer.provide(JmapCredentials.fromAccessToken(accessTokenRef)),
          ),
        ),
        Effect.withSpan('jmap-sync'),
      );
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
