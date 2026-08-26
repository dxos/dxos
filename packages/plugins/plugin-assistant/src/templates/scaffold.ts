//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Instructions from '@dxos/compute/Instructions';
import type * as Routine from '@dxos/compute/Routine';
import * as Skill from '@dxos/compute/Skill';
import * as Trigger from '@dxos/compute/Trigger';
import { Ref } from '@dxos/echo';
import { makeRoutine } from '@dxos/plugin-routine/util';

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
 * The trigger starts enabled: the create-routine dialog shows the schedule and instructions for review
 * before anything is persisted, so a saved routine is one the user has already approved.
 */
export const makeScheduledRoutine = ({
  name,
  text,
  skillKeys,
  cron,
}: ScheduledRoutineOptions): Effect.Effect<Routine.Routine, never, never> => {
  const skills = skillKeys.map((key) => Ref.fromURI(Skill.registryURI(key)));
  return Effect.succeed(
    makeRoutine({
      name,
      instructions: Instructions.make({ name, text, skills }),
      trigger: Trigger.make({ spec: Trigger.specTimer(cron), enabled: true }),
    }),
  );
};
