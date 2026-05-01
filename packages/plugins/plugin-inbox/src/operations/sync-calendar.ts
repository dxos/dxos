//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { Integration } from '@dxos/plugin-integration/types';

import { meta } from '#meta';

import { type Calendar } from '../types';

import { SyncCalendar } from './definitions';

/**
 * Outer wrapper that hands off to the compute-runtime-resident
 * `GoogleCalendarSync` op. The inner op now handles target iteration and
 * lazy materialization itself, so this op is mostly a dispatch +
 * success/error toast layer.
 */
const dispatch = (
  integration: Integration.Integration,
  calendar: Calendar.Calendar | undefined,
) =>
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
      // Per-calendar entry: query for the parent Integration so the inner
      // sync can always source credentials and target state the same way.
      // Integration entry: pass through with no `calendar` arg — the inner
      // op iterates `integration.targets` itself.
      if ('calendar' in input) {
        const db = Obj.getDatabase(input.calendar);
        if (!db) {
          log.warn('calendar has no database; skipping sync', { calendar: input.calendar.id });
        } else {
          const integrations = yield* Effect.promise(() =>
            db.query(Filter.type(Integration.Integration)).run(),
          );
          const parent = integrations.find((integration) =>
            integration.targets.some(
              (target) => target.object?.dxn.asEchoDXN()?.echoId === input.calendar.id,
            ),
          );
          if (!parent) {
            log.warn('no parent Integration found for calendar; skipping sync', { calendar: input.calendar.id });
          } else {
            yield* dispatch(parent, input.calendar);
          }
        }
      } else {
        const integration = input.integration.target;
        if (integration) {
          yield* dispatch(integration, undefined);
        }
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
