//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj, Ref } from '@dxos/echo';

import { Drawing, DrawingOperation, IllustratorCapabilities, IllustratorError } from '#types';

import { UnknownDrawingVariantError, resolveVariant } from '../util/load-drawing.ts';

const handler: Operation.WithHandler<typeof DrawingOperation.Convert> = DrawingOperation.Convert.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing: drawingRef, variant: variantId }) {
      const { drawing, canvas: source, variant: from } = yield* resolveVariant(drawingRef);
      if (from.id === variantId) {
        return yield* Effect.fail(new IllustratorError.SameVariant({ context: { variant: variantId } }));
      }
      const variants = yield* Capability.getAll(IllustratorCapabilities.VariantProvider);
      const to = variants.find((entry) => entry.id === variantId);
      if (!to) {
        return yield* Effect.fail(new UnknownDrawingVariantError(variantId));
      }

      // The scene is the renderer-neutral form, so replaying it onto the target's builder is the
      // whole conversion; each builder re-derives its own records (and arrow bindings) from it.
      const { scene } = from.builder.read(source);
      const target = yield* Database.add(
        to.createCanvas ? yield* to.createCanvas() : Drawing.makeCanvas({ schema: to.id }),
      );
      const { upserted } = to.builder.apply(
        target,
        scene.objects.map((object) => ({ op: 'upsert-object' as const, object })),
      );
      Obj.update(drawing, (drawing) => {
        drawing.canvas = Ref.make(target);
      });
      // The canvas is hidden and reachable only through this drawing, so keeping it would orphan it.
      yield* Database.remove(source);

      const { scene: converted, unmanaged } = to.builder.read(target);
      return { scene: converted, unmanaged, upserted };
    }),
  ),
);

export default handler;
