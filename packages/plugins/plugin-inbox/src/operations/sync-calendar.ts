//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { Integration } from '@dxos/plugin-integration/types';

import { meta } from '#meta';

import { type Calendar } from '../types';
import { SyncCalendar } from './definitions';

const dispatch = (integration: Integration.Integration, calendar: Calendar.Calendar | undefined) =>
  Effect.gen(function* () {
    const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
    const db = Obj.getDatabase(integration);
    invariant(db);
    const runtime = computeRuntime.getRuntime(db.spaceId);
    const { CalendarFunctions } = yield* Effect.promise(() => import('./google/calendar'));
    yield* Effect.tryPromise(() =>
      runtime.runPromise(
        Operation.invoke(CalendarFunctions.Sync, {
          integration: Ref.make(integration),
          ...(calendar ? { calendar: Ref.make(calendar) } : {}),
        }),
      ),
    ).pipe(
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
  });

const handler: Operation.WithHandler<typeof SyncCalendar> = SyncCalendar.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const integrationObj = yield* Database.load(input.integration).pipe(
        Effect.provide(Database.layer(Obj.getDatabase(input.integration.target!)!)),
      );

      if (input.calendar) {
        const calendar = yield* Database.load(input.calendar);
        yield* dispatch(integrationObj, calendar);
      } else {
        yield* dispatch(integrationObj, undefined);
      }

      yield* Operation.invoke(LayoutOperation.AddToast, {
        id: `${meta.id}/sync-calendar-success`,
        icon: 'ph--check--regular',
        duration: 3_000,
        title: ['sync-calendar-success.title', { ns: meta.id }],
        closeLabel: ['close.label', { ns: meta.id }],
      });
    }),
  ),
);

export default handler;
