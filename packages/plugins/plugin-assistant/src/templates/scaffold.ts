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
 * Scaffold a timer-driven routine as an in-memory {@link Routine.RoutineDraft}. The caller's save flow
 * (global create via {@link create-routine} or the companion's Save button) persists the draft atomically;
 * nothing is added to the database here, so the function is always safe to call without DB access.
 *
 * The trigger starts disabled so the user can review the schedule and instructions before activating.
 * The trigger is owned by the routine (cascade-deletes with it); the instructions stays independent
 * (edited separately and potentially reused).
 */
export const makeScheduledRoutine = ({
  name,
  text,
  skillKeys,
  cron,
}: ScheduledRoutineOptions): Effect.Effect<Routine.RoutineDraft, never, never> => {
  const skills = skillKeys.map((key) => Ref.fromURI(Skill.registryURI(key)));
  const instructions = Instructions.make({ name, text, skills });
  const trigger = Trigger.make({ spec: Trigger.specTimer(cron), enabled: false });
  const routine = Routine.make({ name, triggers: [] });
  return Effect.succeed({ routine, instructions, trigger });
};
