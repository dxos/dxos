//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { Database, Obj, type Ref } from '@dxos/echo';

import { Drawing, IllustratorCapabilities } from '#types';

export class UnknownDrawingVariantError extends Error {
  readonly _tag = 'UnknownDrawingVariantError';
  constructor(readonly schema: string) {
    super(`No drawing variant registered for canvas schema: ${schema}.`);
  }
}

/** The schema, or for a typed canvas the type, that no variant claims, for the error a caller reports. */
const describeCanvas = (canvas: Obj.Unknown): string =>
  Drawing.isCanvas(canvas) ? (canvas.schema ?? '') : (Obj.getTypename(canvas) ?? 'unknown');

/**
 * Loads a Drawing and resolves the variant claiming its canvas.
 * Used by the renderer-agnostic read/edit operations.
 */
export const resolveVariant = (
  ref: Ref.Ref<Drawing.Drawing>,
): Effect.Effect<
  { drawing: Drawing.Drawing; canvas: Obj.Unknown; variant: IllustratorCapabilities.DrawingVariant },
  Error,
  Database.Service | Capability.Service
> =>
  Effect.gen(function* () {
    const drawing = yield* Database.load(ref);
    const canvas = yield* Database.load(drawing.canvas);
    const variants = yield* Capability.getAll(IllustratorCapabilities.VariantProvider);
    const variant = IllustratorCapabilities.variantFor(canvas, variants);
    if (!variant) {
      return yield* Effect.fail(new UnknownDrawingVariantError(describeCanvas(canvas)));
    }
    return { drawing, canvas, variant };
  });
