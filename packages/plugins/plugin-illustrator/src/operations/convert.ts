//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import * as DefaultParent from '@dxos/app-toolkit/DefaultParent';
import * as Operation from '@dxos/compute/Operation';
import { Database, Filter, Obj, Ref } from '@dxos/echo';

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
          yield* Database.remove(source);
        }
      } else {
        result = Drawing.make({ name: drawing.name, canvas: target });
        // Filed beside the source, else where a new drawing goes by default, so it shows in the navigator.
        const [beside] = yield* Database.query(ContainerModel.containing(drawing)).run;
        yield* ContainerModel.add({ object: result, target: beside ?? (yield* DefaultParent.resolve(result)) });
      }

      const { scene: converted, unmanaged } = to.builder.read(target);
      return { drawing: Ref.make(result), scene: converted, unmanaged, upserted };
    }),
  ),
);

export default handler;
