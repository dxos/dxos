//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { RunInstructions } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Instructions, Trigger } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { Routine } from '@dxos/plugin-instructions';

/** Registry key of the persisted RunInstructions operation a trigger dispatches. */
const RUN_INSTRUCTIONS_KEY = 'org.dxos.function.runInstructions';

export type ScheduledRoutineOptions = {
  name: string;
  text: string;
  blueprintKeys: readonly string[];
  cron: string;
};

/**
 * Scaffold a timer-driven automation: a Routine (instructions + blueprints) run by the shared RunInstructions
 * operation on a cron schedule. The trigger starts disabled so the user can review the schedule and
 * instructions before activating, and is owned by the automation (cascade-deletes with it); the instructions
 * stays independent, since it is edited separately and may be reused.
 */
export const makeScheduledRoutineAutomation = ({
  name,
  text,
  blueprintKeys,
  cron,
}: ScheduledRoutineOptions): Effect.Effect<Routine.Routine, Error, Database.Service> =>
  Effect.gen(function* () {
    const blueprints = blueprintKeys.map((key) => Ref.fromURI(Blueprint.registryURI(key)));
    const instructions = yield* Database.add(
      Instructions.make({
        name,
        text,
        blueprints,
      }),
    );

    // The trigger's `function` must reference an in-space PersistentOperation; reuse the space's RunInstructions
    // or persist it on first use.
    const existingFns = yield* Database.query(
      Filter.and(Filter.type(Operation.PersistentOperation), Filter.key(RUN_INSTRUCTIONS_KEY)),
    ).run;
    const runInstructionsFn = existingFns[0] ?? (yield* Database.add(Operation.serialize(RunInstructions)));

    const trigger = yield* Database.add(
      Obj.make(Trigger.Trigger, {
        enabled: false,
        function: Ref.make(runInstructionsFn),
        spec: Trigger.specTimer(cron),
        input: { prompt: Ref.make(instructions), input: {} },
        concurrency: 1,
      }),
    );

    const automation = Routine.make({
      name,
      runnable: Ref.make(runInstructionsFn),
      triggers: [Ref.make(trigger)],
    });
    Obj.setParent(trigger, automation);
    return automation;
  });
