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

const handler: Operation.WithHandler<typeof RoutineOperation.CreateRoutine> = RoutineOperation.CreateRoutine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, templateId, name, subject }) {
      const templates = yield* Capability.getAll(RoutineCapabilities.Template);
      const template = templates.find((entry) => entry.id === templateId);
      invariant(template, `Unknown routine template: ${templateId}`);

      const object = yield* template
        .scaffold({ name, subject })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db)));

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
