//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { RoutineCapabilities, RoutineOperation } from '#types';

const handler: Operation.WithHandler<typeof RoutineOperation.CreateRoutine> = RoutineOperation.CreateRoutine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, templateId, name, subject }) {
      const templates = yield* Capability.getAll(RoutineCapabilities.Template);
      const template = templates.find((entry) => entry.id === templateId);
      invariant(template, `Unknown routine template: ${templateId}`);

      // The scaffold returns a fully-wired in-memory routine graph (runnable, owned instructions, and trigger
      // all parented and bound by `makeRoutine`); AddObject's `Database.add` cascades the whole graph.
      const object = yield* template
        .scaffold({ name, subject })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db)));

      // AddObject declares Database.Service; a spaceId-less invocation satisfies it from the calling context.
      return yield* Operation.invoke(SpaceOperation.AddObject, {
        object,
        target: db,
      }).pipe(Effect.provide(Database.layer(db)));
    }),
  ),
);

export default handler;
