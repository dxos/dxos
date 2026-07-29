//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

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
