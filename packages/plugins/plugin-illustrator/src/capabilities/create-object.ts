//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { CreateSketchPanel } from '#components';

import { IllustratorCapabilities, Sketch } from '../types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Sketch.Sketch),
      customPanel: CreateSketchPanel,
      createObject: (
        { variantId, input }: { variantId: string; input?: Record<string, any> },
        options: CreateOptions,
      ) =>
        Effect.gen(function* () {
          const variants = yield* Capability.getAll(IllustratorCapabilities.VariantProvider);
          const variant = variants.find((entry) => entry.id === variantId);
          invariant(variant, `Unknown sketch variant: ${variantId}`);

          const database = Database.makeService(options.db);

          // Build the canvas object via the variant's factory.
          const canvas = yield* variant
            .createCanvas(input ?? {})
            .pipe(Effect.provideService(Database.Service, database));

          // Persist the canvas directly rather than via `AddObject`: it is an implementation detail
          // reached through `Sketch.canvas`, and `CollectionModel.add` files any object into a
          // collection target regardless of HiddenAnnotation — which would surface the canvas as a
          // second navtree item beside the sketch.
          yield* Database.add(canvas).pipe(Effect.provideService(Database.Service, database));

          const sketch = Sketch.make({
            name: typeof input?.name === 'string' ? input.name : undefined,
            canvas,
          });

          // Add the user-facing Sketch wrapper. Not hidden — this is the object the user sees
          // and navigates to. If this second write fails, roll back the canvas so we don't
          // leak an orphaned object into the space.
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object: sketch,
            target: options.target,
            targetNodeId: options.targetNodeId,
          }).pipe(
            Effect.tapError(() =>
              Operation.invoke(SpaceOperation.RemoveObjects, { objects: [canvas] }).pipe(Effect.ignore),
            ),
          );
        }),
    });
  }),
);
