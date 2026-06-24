//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceOperation } from '@dxos/plugin-space';

import { getRoutinesPath } from '../paths';
import { RoutineCapabilities, RoutineOperation } from '../types';
import { saveRoutine } from '../util';

const handler: Operation.WithHandler<typeof RoutineOperation.CreateRoutine> = RoutineOperation.CreateRoutine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, templateId, name, subject }) {
      const templates = yield* Capability.getAll(RoutineCapabilities.Template);
      const template = templates.find((entry) => entry.id === templateId);
      invariant(template, `Unknown routine template: ${templateId}`);

      const draft = yield* template
        .scaffold({ name, subject })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db)));

      // Add the routine shell, then let saveRoutine persist the owned instructions and trigger.
      const routine = db.add(draft.routine);
      yield* Effect.promise(() => saveRoutine(db, routine, draft));

      const targetNodeId = getRoutinesPath(db.spaceId);
      return yield* Operation.invoke(SpaceOperation.AddObject, {
        object: routine,
        target: db,
        targetNodeId,
      });
    }),
  ),
);

export default handler;
