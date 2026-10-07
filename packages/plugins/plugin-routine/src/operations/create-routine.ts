//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { RoutineCapabilities, RoutineEvents, RoutineOperation } from '#types';

const handler: Operation.WithHandler<typeof RoutineOperation.CreateRoutine> = RoutineOperation.CreateRoutine.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ db, templateId, name, subject, input }) {
      yield* Plugin.activate(RoutineEvents.Start);
      const templates = yield* Capability.getAll(RoutineCapabilities.Template);
      const template = templates.find((entry) => entry.id === templateId);
      invariant(template, `Unknown routine template: ${templateId}`);

      // The scaffold returns a fully-wired in-memory routine graph (runnable, owned instructions, and trigger
      // all parented and bound by `makeRoutine`); AddObject's `Database.add` cascades the whole graph.
      const object = yield* template
        .scaffold({ name, subject, input })
        .pipe(Effect.provideService(Database.Service, Database.makeService(db)));

      return yield* Operation.invoke(SpaceOperation.AddObject, { object }, { spaceId: db.spaceId });
    }),
  ),
);

export default handler;
