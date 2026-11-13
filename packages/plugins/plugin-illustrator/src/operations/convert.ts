//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { CreatedFrom } from '@dxos/types';

import { convertByScene } from '#model';
import { Drawing, DrawingOperation, IllustratorCapabilities, IllustratorError } from '#types';

import { UnknownDrawingVariantError, resolveVariant } from '../util/load-drawing.ts';

const handler: Operation.WithHandler<typeof DrawingOperation.Convert> = DrawingOperation.Convert.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ drawing: drawingRef, variant: variantId, replace = false }) {
      const { drawing, canvas: source, variant: from } = yield* resolveVariant(drawingRef);
      if (from.id === variantId) {
        return yield* Effect.fail(new IllustratorError.SameVariant({ context: { variant: variantId } }));
      }
      const variants = yield* Capability.getAll(IllustratorCapabilities.VariantProvider);
      const to = IllustratorCapabilities.findVariant(variants, variantId);
      if (!to) {
        return yield* Effect.fail(new UnknownDrawingVariantError(variantId));
      }

      // A converter the target or source plugin registered for this pair wins over the generic scene replay.
      const converters = yield* Capability.getAll(IllustratorCapabilities.Converter);
      const converter = converters.find((entry) => entry.from === from.id && entry.to === to.id);
      const { canvas: target, upserted } = converter
        ? yield* converter.convert(source, { from, to })
        : yield* convertByScene(source, { from, to });

      let result = drawing;
      if (replace) {
        Obj.update(drawing, (drawing) => {
          drawing.canvas = Ref.make(target);
        });
        // A hidden canvas no drawing references is orphaned; one another drawing still uses must stay.
        const sharing = yield* Database.query(Filter.type(Drawing.Drawing, { canvas: Ref.make(source) })).run;
        if (sharing.length === 0) {
          // A typed canvas owns other objects (a scene canvas its layouts, say), which its variant removes with it.
          if (from.canvasType !== undefined && from.removeCanvas) {
            yield* from.removeCanvas(source);
          } else {
            yield* Database.remove(source);
          }
        }
      } else {
        // The source stays, so the copy records it as what it was made from; a replaced source is removed instead.
        yield* Database.add(
          CreatedFrom.make({
            [Relation.Source]: target,
            [Relation.Target]: source,
            reason: 'conversion',
            createdAt: new Date().toISOString(),
          }),
        );
        // Filed beside the source, else where plugin-space files a new drawing by default, so it shows in the
        // navigator; plugin-space files it because on EDGE this plugin runs without its default-parent rule.
        const [beside] = yield* Database.query(ContainerModel.containing(drawing)).run;
        const { db } = yield* Database.Service;
        const added = yield* Operation.invoke(
          SpaceOperation.AddObject,
          { object: Drawing.make({ name: drawing.name, canvas: target }), target: beside && Ref.make(beside) },
          { spaceId: db.spaceId },
        );
        invariant(Obj.instanceOf(Drawing.Drawing, added.object), 'Expected a Drawing.');
        result = added.object;
      }

      const { scene: converted, unmanaged } = to.builder.read(target);
      return { drawing: Ref.make(result), scene: converted, unmanaged, upserted };
    }),
  ),
);

export default handler;
