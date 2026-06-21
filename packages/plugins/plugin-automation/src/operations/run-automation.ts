//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation, Routine } from '@dxos/compute';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { AutomationOperation } from '../types';

// An automation's action is either an Operation bound to `runnable`, or a Routine owned by (parented to)
// the automation — the two variants the action editor produces. Manual runs dispatch accordingly: the
// runnable is invoked directly; the routine runs as an agent prompt in a new background chat (the same
// path the assistant uses), so its instructions and blueprints take effect.
const handler: Operation.WithHandler<typeof AutomationOperation.RunAutomation> = AutomationOperation.RunAutomation.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ automation }) {
      const automationObj = yield* Database.load(automation);
      const db = Obj.getDatabase(automationObj);
      invariant(db, 'Automation is not attached to a database.');

      if (automationObj.runnable) {
        const runnable = yield* Database.load(automationObj.runnable);
        invariant(Obj.instanceOf(Operation.PersistentOperation, runnable), 'Runnable is not a persistent operation.');
        yield* Operation.invoke(Operation.deserialize(runnable));
        return;
      }

      const routines = yield* Effect.promise(() => db.query(Filter.type(Routine.Routine)).run());
      const routine = routines.find((candidate) => Obj.getParent(candidate)?.id === automationObj.id);
      invariant(routine, 'Automation has no action to run.');

      // Bind the automation's context objects to the new chat so the routine's agent can access them.
      const objects =
        automationObj.objects && automationObj.objects.length > 0
          ? yield* Effect.forEach(automationObj.objects, (ref) => Database.load(ref))
          : undefined;

      yield* Operation.invoke(AutomationOperation.RunPromptInNewChat, {
        db,
        prompt: Ref.make(routine),
        objects,
        background: true,
      });
    }),
  ),
);

export default handler;
