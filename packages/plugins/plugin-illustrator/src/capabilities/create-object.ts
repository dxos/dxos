//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { CreateDrawingPanel } from '#components';

import { Drawing, IllustratorCapabilities } from '../types';

type CreateOptions = Parameters<SpaceCapabilities.CreateObjectEntry['createObject']>[1];

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Drawing.Drawing),
      customPanel: CreateDrawingPanel,
      createObject: (
        { variantId, input }: { variantId: string; input?: Record<string, any> },
        options: CreateOptions,
      ) =>
        Effect.gen(function* () {
          const variants = yield* Capability.getAll(IllustratorCapabilities.VariantProvider);
          const variant = variants.find((entry) => entry.id === variantId);
          invariant(variant, `Unknown drawing variant: ${variantId}`);

          // Build the canvas: variants only supply a factory when they extend the base type.
          const canvas = variant.createCanvas
            ? yield* variant
                .createCanvas(input ?? {})
                .pipe(Effect.provideService(Database.Service, Database.makeService(options.db)))
            : Drawing.makeCanvas({ schema: variant.id });

          // Add the canvas to the database. It carries HiddenAnnotation, so `CollectionModel.add`
          // persists it without filing it into the target collection.
          yield* Operation.invoke(SpaceOperation.AddObject, {
            object: canvas,
            target: options.target,
            targetNodeId: options.targetNodeId,
          });

          const drawing = Drawing.make({
            name: typeof input?.name === 'string' ? input.name : undefined,
            canvas,
          });

          // Add the user-facing Drawing wrapper. Not hidden — this is the object the user sees
          // and navigates to. If this second write fails, roll back the canvas so we don't
          // leak an orphaned object into the space.
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object: drawing,
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
