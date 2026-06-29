//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Trigger } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type RoutineCapabilities, Routine } from '@dxos/plugin-routine/types';

import { FeedOperation, Magazine } from '#types';

/** Default cron for a magazine curation routine: daily at 9 AM. The user edits the schedule from the trigger. */
const DEFAULT_CRON = '0 9 * * *';

/**
 * Magazine curation template. Creates a routine that invokes {@link FeedOperation.CurateMagazine} for
 * the companion's Magazine subject on a daily schedule. Only visible in Magazine object companions.
 */
export const magazineCuration: RoutineCapabilities.Template = {
  id: 'org.dxos.routine.magazineCuration',
  label: 'Curate Magazine',
  icon: 'ph--sparkle--regular',
  appliesTo: (subject) => subject != null && Magazine.instanceOf(subject),
  scaffold: ({ name, subject }) =>
    Effect.gen(function* () {
      invariant(
        subject != null && Magazine.instanceOf(subject),
        'Magazine curation template requires a Magazine subject.',
      );

      const magazine = subject;

      // Pre-populate the trigger's input so the magazine binding is preserved through the save flow.
      return Routine.make({
        name: name ?? magazine.name ?? 'Curate Magazine',
        // Bind the CurateMagazine operation directly as the action (an operation action, not instructions-based).
        spec: { kind: 'runnable', runnable: Ref.fromURI(FeedOperation.CurateMagazine.meta.key) },
        trigger: Trigger.make({
          enabled: false,
          spec: Trigger.specTimer(DEFAULT_CRON),
          input: { magazine: Ref.make(magazine) },
        }),
      });
    }),
};
