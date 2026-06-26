//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Skill, Instructions, Trigger } from '@dxos/compute';
import { Ref } from '@dxos/echo';
import { Routine } from '@dxos/plugin-routine/types';

export type ScheduledRoutineOptions = {
  name: string;
  text: string;
  skillKeys: readonly string[];
  cron: string;
};

/**
 * Scaffold a timer-driven routine as an in-memory {@link Routine.Routine} draft graph. The caller's save
 * flow (the companion's Save button) persists it; nothing is added to the database here, so the function is
 * always safe to call without DB access.
 *
 * The trigger starts disabled so the user can review the schedule and instructions before activating.
 */
export const makeScheduledRoutine = ({
  name,
  text,
  skillKeys,
  cron,
}: ScheduledRoutineOptions): Effect.Effect<Routine.Routine, never, never> => {
  const skills = skillKeys.map((key) => Ref.fromURI(Skill.registryURI(key)));
  return Effect.succeed(
    Routine.make({
      name,
      instructions: Instructions.make({ name, text, skills }),
      trigger: Trigger.make({ spec: Trigger.specTimer(cron), enabled: false }),
    }),
  );
};
