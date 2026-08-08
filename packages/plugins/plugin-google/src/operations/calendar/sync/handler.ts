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
import { InboxOperation } from '@dxos/plugin-inbox/types';

import { GoogleCalendarApi, GoogleCredentials } from '../../../services';
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
      // `GoogleCalendarApi.Live` absorbs the HTTP client + credentials, so `syncCalendar` itself
      // requires only the service (which a test swaps for `GoogleCalendarApi.mock`).
      const credentials = Layer.mergeAll(FetchHttpClient.layer, GoogleCredentials.fromAccessToken(accessTokenRef));
      return yield* syncCalendar(props).pipe(
        Effect.provide(
          Layer.mergeAll(
            GoogleCalendarApi.Live.pipe(Layer.provide(credentials)),
            InboxResolver.Live,
            Database.layer(db),
          ),
        ),
      );
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
