//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
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

      // The action kind is explicit in `spec`; dispatch by kind rather than dereferencing to classify.
      const spec = routineObj.spec;
      if (spec?.kind === 'instructions') {
        // The instructions carry their own context objects and skills; RunInstructions binds them to the
        // session, so the run does not forward context separately.
        yield* Operation.invoke(RoutineOperation.RunPromptInNewChat, {
          db,
          instructions: spec.instructions,
          background: true,
        });
        return;
      }

      invariant(spec?.kind === 'runnable', 'Routine has no action to run.');
      const operation = yield* Database.load(spec.runnable);
      invariant(Obj.instanceOf(Operation.PersistentOperation, operation), 'Routine has no action to run.');
      yield* Operation.invoke(Operation.deserialize(operation));
    }),
  ),
);

export default handler;
