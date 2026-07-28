//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Database, Obj, type Ref, Type } from '@dxos/echo';

import * as IllustratorCapabilities from '../types/IllustratorCapabilities';
import * as Sketch from '../types/Sketch';
import { type SketchVariant } from '../types/types';

export class SketchVariantMismatchError extends Error {
  readonly _tag = 'SketchVariantMismatchError';
  constructor(
    readonly sketchId: string,
    readonly expectedTypename: string,
    readonly actualTypename: string,
  ) {
    super(`Sketch ${sketchId} canvas typename mismatch: expected ${expectedTypename}, got ${actualTypename}.`);
  }
}

export class UnknownSketchVariantError extends Error {
  readonly _tag = 'UnknownSketchVariantError';
  constructor(readonly typename: string) {
    super(`No sketch variant registered for canvas type: ${typename}.`);
  }
}

/**
 * Loads a Sketch from a Ref and resolves its canvas, asserting the canvas matches
 * the expected type. Returns the typed pair.
 *
 * Use in operation handlers that declare `input.sketch: SketchRef<MyCanvas>`.
 */
export const loadSketch = <S extends Type.AnyObj>(
  ref: Ref.Ref<Sketch.Sketch>,
  canvasType: S,
): Effect.Effect<{ sketch: Sketch.Sketch; canvas: Type.InstanceType<S> }, Error, Database.Service> =>
  Effect.gen(function* () {
    const sketch = yield* Database.load(ref);
    const canvas = yield* Database.load(sketch.canvas);
    if (!Obj.instanceOf(canvasType, canvas)) {
      const expected = Type.getTypename(canvasType) ?? 'unknown';
      const actual = Obj.getTypename(canvas as Obj.Any) ?? 'unknown';
      return yield* Effect.fail(new SketchVariantMismatchError(sketch.id, expected, actual));
    }
    return { sketch, canvas: canvas as Type.InstanceType<S> };
  });

/**
 * Loads a Sketch and resolves the variant provider matching its canvas typename.
 * Used by the renderer-agnostic read/edit operations.
 */
export const resolveVariant = (
  ref: Ref.Ref<Sketch.Sketch>,
): Effect.Effect<
  { sketch: Sketch.Sketch; canvas: Obj.Any; variant: SketchVariant },
  Error,
  Database.Service | Capability.Service
> =>
  Effect.gen(function* () {
    const sketch = yield* Database.load(ref);
    const canvas = (yield* Database.load(sketch.canvas)) as Obj.Any;
    const typename = Obj.getTypename(canvas) ?? 'unknown';
    const variants = yield* Capability.getAll(IllustratorCapabilities.VariantProvider);
    const variant = variants.find((entry) => entry.id === typename);
    if (!variant) {
      return yield* Effect.fail(new UnknownSketchVariantError(typename));
    }
    return { sketch, canvas, variant };
  });
