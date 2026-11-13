//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Drawing, DrawingOperation, IllustratorCapabilities } from '#types';

import { UnknownDrawingVariantError } from '../util/load-drawing.ts';

const handler: Operation.WithHandler<typeof DrawingOperation.Create> = DrawingOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, variant: variantId }) {
      const variants = yield* Capability.getAll(IllustratorCapabilities.VariantProvider);
      const variant = variantId
        ? IllustratorCapabilities.findVariant(variants, variantId)
        : variants.find((entry) => !entry.hidden);
      if (!variant) {
        return yield* Effect.fail(new UnknownDrawingVariantError(variantId ?? '(none registered)'));
      }
      const canvas = variant.createCanvas ? yield* variant.createCanvas() : Drawing.makeCanvas({ schema: variant.id });
      // Persisted here, canvas first: an agent has only this operation to create a drawing, and a
      // drawing it has to add itself arrives without its hidden canvas.
      yield* Database.add(canvas);
      // The drawing is filed by plugin-space, so it shows in the navigator; on EDGE this plugin runs without
      // plugin-space's default-parent rule.
      const { db } = yield* Database.Service;
      const { object } = yield* Operation.invoke(
        SpaceOperation.AddObject,
        { object: Drawing.make({ name, canvas }) },
        { spaceId: db.spaceId },
      );
      invariant(Obj.instanceOf(Drawing.Drawing, object), 'Expected a Drawing.');
      return { object };
    }),
  ),
);

export default handler;
