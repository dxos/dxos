//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { meta } from '#meta';

import { SyncCalendar } from './definitions';

const handler: Operation.WithHandler<typeof SyncCalendar> = SyncCalendar.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ calendar }) {
      const db = Obj.getDatabase(calendar);
      invariant(db);
      const { CalendarFunctions } = yield* Effect.promise(() => import('./google/calendar'));
      yield* Operation.invoke(CalendarFunctions.Sync, { calendar: Ref.make(calendar) }, { spaceId: db.spaceId }).pipe(
        Effect.catchAll((error) => {
          log.catch(error);
          return Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.id}/sync-calendar-error`,
            icon: 'ph--warning--regular',
            duration: 5_000,
            title: ['sync-calendar-error.title', { ns: meta.id }],
            closeLabel: ['close.label', { ns: meta.id }],
          });
        }),
      );
    }),
  ),
);

export default handler;
