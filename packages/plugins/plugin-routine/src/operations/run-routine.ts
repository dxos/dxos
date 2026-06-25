//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation, Instructions } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { RoutineOperation } from '../types';

// A routine's action is its `runnable`: either an Operation (invoked directly) or the routine's owned
// Instructions object (run as an agent prompt in a new background chat — the same path the assistant uses —
// so its instructions and skills take effect).
const handler: Operation.WithHandler<typeof RoutineOperation.RunRoutine> = RoutineOperation.RunRoutine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ routine }) {
      const routineObj = yield* Database.load(routine);
      const db = Obj.getDatabase(routineObj);
      invariant(db, 'Routine is not attached to a database.');

      // `runnable` is a union of refs (`Ref<Operation> | Ref<Instructions>`); widen to a ref of the union so
      // Database.load infers a single target type, then narrow by instance below.
      const runnableRef: Ref.Ref<Operation.PersistentOperation | Instructions.Instructions> | undefined =
        routineObj.runnable;
      const runnable = runnableRef ? yield* Database.load(runnableRef) : undefined;

      if (Obj.instanceOf(Instructions.Instructions, runnable)) {
        // The instructions carry their own context objects and skills; RunInstructions binds them to the
        // session, so the run does not forward context separately.
        yield* Operation.invoke(RoutineOperation.RunPromptInNewChat, {
          db,
          instructions: Ref.make(runnable),
          background: true,
        });
        return;
      }

      invariant(Obj.instanceOf(Operation.PersistentOperation, runnable), 'Routine has no action to run.');
      yield* Operation.invoke(Operation.deserialize(runnable));
    }),
  ),
);

export default handler;
