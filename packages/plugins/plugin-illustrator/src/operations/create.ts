//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { IllustratorCapabilities, Sketch, SketchOperation } from '../types';
import { UnknownSketchVariantError } from '../util/load-sketch';

const handler: Operation.WithHandler<typeof SketchOperation.Create> = SketchOperation.Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, variant: variantId }) {
      const variants = yield* Capability.getAll(IllustratorCapabilities.VariantProvider);
      const variant = variantId ? variants.find((entry) => entry.id === variantId) : variants[0];
      if (!variant) {
        return yield* Effect.fail(new UnknownSketchVariantError(variantId ?? '(none registered)'));
      }
      const canvas = yield* variant.createCanvas();
      return { object: Sketch.make({ name, canvas }) };
    }),
  ),
);

export default handler;
