//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import * as InboxResolver from '@dxos/extractor-lib';

import { GoogleCredentials } from '../../../../services';
import { InboxOperation } from '../../../../types';
import { type SyncCalendarProps, syncCalendar } from './sync';

const handler = InboxOperation.GoogleCalendarSync.pipe(
  Operation.withHandler((props: SyncCalendarProps) =>
    Effect.gen(function* () {
      const bindingObj = props.binding.target;
      const db = bindingObj ? Obj.getDatabase(bindingObj) : undefined;
      if (!bindingObj || !db) {
        return { newEvents: 0 };
      }

      // Composer's invoker is wired without a `databaseResolver`, so derive the db from the binding's
      // target and provide `Database.layer(db)` ourselves (alongside the Google Calendar credentials).
      const connectionRef = Ref.make(Relation.getSource(bindingObj));
      return yield* syncCalendar(props).pipe(
        Effect.provide(
          Layer.mergeAll(
            FetchHttpClient.layer,
            InboxResolver.Live,
            GoogleCredentials.fromConnection(connectionRef),
            Database.layer(db),
          ),
        ),
      );
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
