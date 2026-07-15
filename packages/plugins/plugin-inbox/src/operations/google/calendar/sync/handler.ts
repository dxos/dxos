//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import * as InboxResolver from '@dxos/extractor-lib';
import { Cursor } from '@dxos/link';

import { GoogleCredentials } from '../../../../services';
import { InboxOperation } from '../../../../types';
import { type SyncCalendarProps, syncCalendar } from './sync';

const handler = InboxOperation.GoogleCalendarSync.pipe(
  Operation.withHandler((props: SyncCalendarProps) =>
    Effect.gen(function* () {
      const bindingObj = props.binding.target;
      const db = bindingObj ? Obj.getDatabase(bindingObj) : undefined;
      if (!bindingObj || !db || !Cursor.isExternal(bindingObj)) {
        return { newEvents: 0 };
      }

      const accessTokenRef = bindingObj.spec.source;
      // Composer's invoker is wired without a `databaseResolver`, so derive the db from the binding's
      // target and provide `Database.layer(db)` ourselves (alongside the Google Calendar credentials).
      return yield* syncCalendar(props).pipe(
        Effect.provide(
          Layer.mergeAll(
            FetchHttpClient.layer,
            InboxResolver.Live,
            GoogleCredentials.fromAccessToken(accessTokenRef),
            Database.layer(db),
          ),
        ),
      );
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
