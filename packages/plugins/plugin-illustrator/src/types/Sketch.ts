//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { CardAnnotation, CollectionItemAnnotation } from '@dxos/schema';

/**
 * Base Sketch object. Renderer-specific canvas data lives in a separate referenced object.
 * Unifies all canvas renderers (tldraw, excalidraw, ...) under one typename so they share
 * graph node, create flow, and shared surface scaffolding.
 */
export class Sketch extends Type.makeObject<Sketch>(DXN.make('org.dxos.type.sketch', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    canvas: Ref.Ref(Obj.Unknown)
      .annotations({ description: 'Reference to the renderer-specific canvas object.' })
      .pipe(FormInputAnnotation.set(false)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--compass-tool--regular', hue: 'indigo' }),
    CardAnnotation.set(true),
    CollectionItemAnnotation.set(true),
  ),
) {}

/**
 * Variant-narrowed reference to a Sketch.
 *
 * Encodes — at the type level — that the canvas ref points to a specific canvas type.
 * Runtime narrowing is performed by `loadSketch(ref, canvasType)` which validates and
 * returns the resolved Sketch together with its typed canvas.
 *
 * @example
 * ```ts
 * input: Schema.Struct({
 *   sketch: SketchRef(Tldraw.Canvas),
 * }),
 * // handler:
 * const { sketch, canvas } = yield* loadSketch(input.sketch, Tldraw.Canvas);
 * // `canvas` is typed as Tldraw.Canvas.
 * ```
 */
export type SketchRef<_V> = Ref.Ref<Sketch>;

export const SketchRef = <S extends Type.AnyObj>(_canvasType: S) =>
  Ref.Ref(Sketch) as Schema.Schema<SketchRef<Type.InstanceType<S>>, any, never>;

/**
 * Build a base `Sketch` object referencing the given canvas ECHO object.
 *
 * The canvas is stored as a `Ref` so the renderer-specific data (e.g. `Tldraw.Canvas`,
 * `Excalidraw.Canvas`) lives as its own ECHO object alongside the Sketch.
 *
 * @param name Optional display name shown in the graph node and Properties form.
 * @param canvas Renderer-specific canvas object.
 * @returns A new `Sketch` object with `canvas` stored as a Ref.
 */
export const make = ({ name, canvas }: { name?: string; canvas: Obj.Unknown }): Sketch => {
  return Obj.make(Sketch, { name, canvas: Ref.make(canvas) });
};

/** Type guard for {@link Sketch} objects. */
export const isSketch = (object: unknown): object is Sketch => Obj.instanceOf(Sketch, object);
