//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Trigger from '@dxos/compute/Trigger';
import { Database, Ref } from '@dxos/echo';
import type * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import { makeRoutine } from '@dxos/plugin-routine/util';

import { FeedOperation, Magazine } from '#types';

/** Default cron for a magazine curation routine: daily at 9 AM. The user edits the schedule from the trigger. */
const DEFAULT_CRON = '0 9 * * *';

const Input = Schema.Struct({
  magazine: Ref.Ref(Magazine.Magazine).annotate({ title: 'Magazine' }),
});

/**
 * Magazine curation template. Creates a routine that invokes {@link FeedOperation.CurateMagazine} for
 * the chosen Magazine on a daily schedule.
 */
export const magazineCuration: RoutineCapabilities.Template = {
  id: 'org.dxos.routine.magazineCuration',
  label: 'Curate Magazine',
  icon: 'ph--sparkle--regular',
  inputSchema: Input,
  scaffold: ({ name, input }) =>
    Effect.gen(function* () {
      if (!Ref.isRef(input?.magazine)) {
        return yield* Effect.fail(new Error('Magazine curation template requires a magazine.'));
      }
      const magazine = yield* Database.resolve(input.magazine, Magazine.Magazine);

      // Pre-populate the trigger's input so the magazine binding is preserved through the save flow.
      return makeRoutine({
        name: name ?? magazine.name ?? 'Curate Magazine',
        // Bind the CurateMagazine operation directly as the action (an operation action, not instructions-based).
        spec: { kind: 'runnable', runnable: Ref.fromURI(FeedOperation.CurateMagazine.meta.key) },
        trigger: Trigger.make({
          enabled: true,
          spec: Trigger.specTimer(DEFAULT_CRON),
          input: { magazine: Ref.make(magazine) },
        }),
      });
    }),
};
