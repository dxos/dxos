//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { Drawing, DrawingOperation, IllustratorCapabilities } from '../types';
import { UnknownDrawingVariantError } from '../util/load-drawing';

const handler: Operation.WithHandler<typeof DrawingOperation.Create> = DrawingOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, variant: variantId }) {
      const variants = yield* Capability.getAll(IllustratorCapabilities.VariantProvider);
      const variant = variantId ? variants.find((entry) => entry.id === variantId) : variants[0];
      if (!variant) {
        return yield* Effect.fail(new UnknownDrawingVariantError(variantId ?? '(none registered)'));
      }
      const canvas = variant.createCanvas ? yield* variant.createCanvas() : Drawing.makeCanvas({ schema: variant.id });
      return { object: Drawing.make({ name, canvas }) };
    }),
  ),
);

export default handler;
