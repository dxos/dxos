//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { RunInstructions } from '@dxos/assistant-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { RoutineOperation } from '../types';

// A routine's action is its `runnable`: either an Operation (invoked directly) or the routine's owned
// Instructions object (run as a background process — the same path triggers use — without creating a new
// Chat session object).
const handler: Operation.WithHandler<typeof RoutineOperation.RunRoutine> = RoutineOperation.RunRoutine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ routine }) {
      const routineObj = yield* Database.load(routine);
      const db = Obj.getDatabase(routineObj);
      invariant(db, 'Routine is not attached to a database.');

      // The action kind is explicit in `spec`; dispatch by kind rather than dereferencing to classify.
      const spec = routineObj.spec;
      if (spec?.kind === 'instructions') {
        // The instructions carry their own context objects and skills; RunInstructions binds them when it
        // executes. No Chat session object is created — the run appears in the process monitor only.
        yield* Operation.schedule(
          RunInstructions,
          { instructions: spec.instructions, input: {} },
          { spaceId: db.spaceId },
        );
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
