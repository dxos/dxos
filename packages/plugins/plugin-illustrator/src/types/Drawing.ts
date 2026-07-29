//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, HiddenAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { CardAnnotation, CollectionItemAnnotation } from '@dxos/schema';

/**
 * Canvas content shared by every renderer: an opaque map of record id → record, managed by the
 * renderer's store adapter and CRDT-merged by ECHO without knowing its shape. `schema` identifies
 * the renderer dialect (e.g. `tldraw.com/2`, `excalidraw.com/2`) and is how a `Drawing` is matched
 * to the variant that can render it.
 *
 * Hidden: reached through `Drawing.canvas`, never listed on its own.
 */
export class Canvas extends Type.makeObject<Canvas>(DXN.make('org.dxos.type.canvas', '0.1.0'))(
  Schema.Struct({
    schema: Schema.String.pipe(Schema.optional),
    content: Schema.Record({ key: Schema.String, value: Schema.Any }),
  }).pipe(HiddenAnnotation.set(true)),
) {}

export type MakeCanvasOptions = Partial<Obj.MakeProps<typeof Canvas>>;

/** Creates a {@link Canvas} for the given renderer schema. */
export const makeCanvas = ({ schema, content = {} }: MakeCanvasOptions = {}): Canvas =>
  Obj.make(Canvas, { schema, content });

/** Type guard for {@link Canvas} objects. */
export const isCanvas = (object: unknown): object is Canvas => Obj.instanceOf(Canvas, object);

/**
 * Base Drawing object. Renderer-specific behaviour lives in the variant that claims the canvas's
 * `schema`, so all renderers (tldraw, excalidraw, ...) share one typename, graph node, create
 * flow, and surface scaffolding.
 */
export class Drawing extends Type.makeObject<Drawing>(DXN.make('org.dxos.type.drawing', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    canvas: Ref.Ref(Canvas)
      .annotations({ description: 'Reference to the canvas holding the renderer-specific content.' })
      .pipe(FormInputAnnotation.set(false)),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--compass-tool--regular', hue: 'indigo' }),
    CardAnnotation.set(true),
    CollectionItemAnnotation.set(true),
  ),
) {}

/**
 * Build a `Drawing` referencing the given canvas.
 *
 * @param name Optional display name shown in the graph node and Properties form.
 * @param canvas Canvas holding the renderer's content.
 */
export const make = ({ name, canvas }: { name?: string; canvas: Canvas }): Drawing =>
  Obj.make(Drawing, { name, canvas: Ref.make(canvas) });

/** Type guard for {@link Drawing} objects. */
export const isDrawing = (object: unknown): object is Drawing => Obj.instanceOf(Drawing, object);
