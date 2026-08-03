//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Database, type Ref } from '@dxos/echo';

import * as Drawing from '../types/Drawing';
import * as IllustratorCapabilities from '../types/IllustratorCapabilities';
import { type DrawingVariant } from '../types/types';

export class UnknownDrawingVariantError extends Error {
  readonly _tag = 'UnknownDrawingVariantError';
  constructor(readonly schema: string) {
    super(`No drawing variant registered for canvas schema: ${schema}.`);
  }
}

/**
 * Loads a Drawing and resolves the variant claiming its canvas `schema`.
 * Used by the renderer-agnostic read/edit operations.
 */
export const resolveVariant = (
  ref: Ref.Ref<Drawing.Drawing>,
): Effect.Effect<
  { drawing: Drawing.Drawing; canvas: Drawing.Canvas; variant: DrawingVariant },
  Error,
  Database.Service | Capability.Service
> =>
  Effect.gen(function* () {
    const drawing = yield* Database.load(ref);
    const canvas = yield* Database.load(drawing.canvas);
    const schema = canvas.schema ?? '';
    const variants = yield* Capability.getAll(IllustratorCapabilities.VariantProvider);
    const variant = variants.find((entry) => entry.id === schema);
    if (!variant) {
      return yield* Effect.fail(new UnknownDrawingVariantError(schema));
    }
    return { drawing, canvas, variant };
  });

/** Resolve a variant by canvas schema, for callers that already hold the canvas. */
export const findVariant = (
  variants: readonly DrawingVariant[],
  canvas: Pick<Drawing.Canvas, 'schema'> | undefined,
): DrawingVariant | undefined => variants.find((entry) => entry.id === (canvas?.schema ?? ''));
