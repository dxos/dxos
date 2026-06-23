//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation, Instructions } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { RoutineOperation } from '../types';

// A routine's action is either an Operation bound to `runnable`, or an Instructions object owned by
// (parented to) the routine — the two variants the action editor produces. Manual runs dispatch accordingly:
// the runnable is invoked directly; the instructions run as an agent prompt in a new background chat (the
// same path the assistant uses), so its instructions and skills take effect.
const handler: Operation.WithHandler<typeof RoutineOperation.RunRoutine> = RoutineOperation.RunRoutine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ routine }) {
      const routineObj = yield* Database.load(routine);
      const db = Obj.getDatabase(routineObj);
      invariant(db, 'Routine is not attached to a database.');

      if (routineObj.runnable) {
        const runnable = yield* Database.load(routineObj.runnable);
        invariant(Obj.instanceOf(Operation.PersistentOperation, runnable), 'Runnable is not a persistent operation.');
        yield* Operation.invoke(Operation.deserialize(runnable));
        return;
      }

      const instructions = yield* Effect.promise(() => db.query(Filter.type(Instructions.Instructions)).run());
      const instruction = instructions.find((candidate) => Obj.getParent(candidate)?.id === routineObj.id);
      invariant(instruction, 'Routine has no action to run.');

      // The instructions carry their own context objects and skills; RunInstructions binds them to the
      // session, so the run does not forward context separately.
      yield* Operation.invoke(RoutineOperation.RunPromptInNewChat, {
        db,
        instructions: Ref.make(instruction),
        background: true,
      });
    }),
  ),
);

export default handler;
