//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Operation } from '@dxos/compute';
import { Obj, Ref, Relation } from '@dxos/echo';
import * as InboxResolver from '@dxos/extractor-lib';

import { GoogleCredentials, GoogleMailApi } from '../../../../services';
import { InboxOperation } from '../../../../types';
import { type SyncGmailProps, syncGmail } from './sync';

const handler = InboxOperation.GoogleMailSync.pipe(
  Operation.withHandler((props: SyncGmailProps) =>
    Effect.gen(function* () {
      const { binding: bindingRef } = props;
      const bindingObj = bindingRef.target;
      if (!bindingObj || !Obj.getDatabase(bindingObj)) {
        return { newMessages: 0 };
      }

      const connectionRef = Ref.make(Relation.getSource(bindingObj));
      return yield* syncGmail(props).pipe(
        Effect.provide(
          Layer.mergeAll(
            GoogleMailApi.Live.pipe(
              Layer.provide(Layer.mergeAll(FetchHttpClient.layer, GoogleCredentials.fromConnection(connectionRef))),
            ),
            InboxResolver.Live,
          ),
        ),
      );
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
