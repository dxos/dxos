//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, SystemTypeAnnotation } from '@dxos/echo/internal';

export const TLDRAW_SCHEMA = 'tldraw.com/2';

export const Canvas = Schema.Struct({
  /** Fully qualified external schema reference. */
  // TODO(wittjosiah): Remove once the schema is fully internalized.
  schema: Schema.String.pipe(Schema.optional),
  content: Schema.Record({ key: Schema.String, value: Schema.Any }),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.canvas',
    version: '0.1.0',
  }),
  SystemTypeAnnotation.set(true),
);
export interface Canvas extends Schema.Schema.Type<typeof Canvas> {}

export const Sketch = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  canvas: Ref.Ref(Canvas).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.sketch',
    version: '0.1.0',
  }),
);
export interface Sketch extends Schema.Schema.Type<typeof Sketch> {}

export type SketchProps = Omit<Obj.MakeProps<typeof Sketch>, 'canvas'> & {
  canvas?: Partial<Obj.MakeProps<typeof Canvas>>;
};

export const make = ({ canvas: canvasProps, ...props }: SketchProps = {}) => {
  const { schema = TLDRAW_SCHEMA, content = {} } = canvasProps ?? {};
  const canvas = Obj.make(Canvas, { schema, content });
  return Obj.make(Sketch, { ...props, canvas: Ref.make(canvas) });
};

/**
 * Type guard for {@link Sketch} objects. Delegates to `Schema.is(Sketch)(object)`.
 * The `_schema` parameter is intentionally ignored pending reconciliation with the Excalidraw plugin.
 */
// TODO(wittjosiah): Reconcile canvas schema check with Excalidraw plugin.
// export const isSketch = (object: any, schema: string): object is Sketch =>
//   Schema.is(Sketch)(object) && object.canvas.target?.schema === schema;
export const isSketch = (object: any, _schema: string): object is Sketch => Schema.is(Sketch)(object);
