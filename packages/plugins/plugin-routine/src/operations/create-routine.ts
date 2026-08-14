//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Routine from '@dxos/compute/Routine';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { RoutineCapabilities, RoutineOperation } from '#types';

import { getRoutinesPath } from '../paths';

const handler: Operation.WithHandler<typeof RoutineOperation.CreateRoutine> = RoutineOperation.CreateRoutine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, templateId, name, subject, draft }) {
      let object = draft;
      if (!object) {
        const templates = yield* Capability.getAll(RoutineCapabilities.Template);
        const template = templates.find((entry) => entry.id === templateId);
        invariant(template, `Unknown routine template: ${templateId}`);

        // The scaffold returns a fully-wired in-memory routine graph (runnable, owned instructions, and trigger
        // all parented and bound by `makeRoutine`); AddObject's `Database.add` cascades the whole graph.
        object = yield* template
          .scaffold({ name, subject })
          .pipe(Effect.provideService(Database.Service, Database.makeService(db)));
      }
      invariant(Obj.instanceOf(Routine.Routine, object), 'Draft is not a routine');

      const targetNodeId = getRoutinesPath(db.spaceId);
      return yield* Operation.invoke(SpaceOperation.AddObject, {
        object,
        target: db,
        targetNodeId,
      });
    }),
  ),
);

export default handler;
