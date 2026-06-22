//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AgentPrompt } from '@dxos/assistant-toolkit';
import { Skill, Operation, Routine, Trigger } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Automation } from '@dxos/plugin-automation';

/** Registry key of the persisted AgentPrompt ("Run Routine") operation a routine trigger dispatches. */
const AGENT_PROMPT_KEY = 'org.dxos.function.prompt';

export type ScheduledRoutineOptions = {
  name: string;
  instructions: string;
  skillKeys: readonly string[];
  cron: string;
};

/**
 * Scaffold a timer-driven automation: a Routine (instructions + skills) run by the shared AgentPrompt
 * operation on a cron schedule. The trigger starts disabled so the user can review the schedule and
 * instructions before activating, and is owned by the automation (cascade-deletes with it); the routine
 * stays independent, since it is edited separately and may be reused.
 */
export const makeScheduledRoutineAutomation = ({
  name,
  instructions,
  skillKeys,
  cron,
}: ScheduledRoutineOptions): Effect.Effect<Automation.Automation, Error, Database.Service> =>
  Effect.gen(function* () {
    const skills = skillKeys.map((key) => Ref.fromURI(Skill.registryURI(key)));
    const routine = yield* Database.add(
      Routine.make({
        name,
        instructions,
        // No per-run input; the task lives in the instructions. Unknown (not Void) so the empty trigger
        // input still validates.
        input: Schema.Unknown,
        output: Schema.Void,
        skills,
      }),
    );

    // The trigger's `function` must reference an in-space PersistentOperation; reuse the space's AgentPrompt
    // or persist it on first use.
    const existingFns = yield* Database.query(
      Filter.and(Filter.type(Operation.PersistentOperation), Filter.key(AGENT_PROMPT_KEY)),
    ).run;
    const agentPromptFn = existingFns[0] ?? (yield* Database.add(Operation.serialize(AgentPrompt)));

    const trigger = yield* Database.add(
      Obj.make(Trigger.Trigger, {
        enabled: false,
        function: Ref.make(agentPromptFn),
        spec: Trigger.specTimer(cron),
        input: { prompt: Ref.make(routine), input: {} },
        concurrency: 1,
      }),
    );

    const automation = Automation.make({
      name,
      runnable: Ref.make(agentPromptFn),
      triggers: [Ref.make(trigger)],
    });
    Obj.setParent(trigger, automation);
    return automation;
  });
