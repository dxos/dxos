//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, HiddenAnnotation } from '@dxos/echo/internal';

export const TLDRAW_SCHEMA = 'tldraw.com/2';

export const Canvas = Schema.Struct({
  /** Fully qualified external schema reference. */
  // TODO(wittjosiah): Remove once the schema is fully internalized.
  schema: Schema.String.pipe(Schema.optional),
  content: Schema.Record({ key: Schema.String, value: Schema.Any }),
}).pipe(HiddenAnnotation.set(true), Type.makeObject(DXN.make('org.dxos.type.canvas', '0.1.0')));
export type Canvas = Type.InstanceType<typeof Canvas>;

export const Sketch = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  canvas: Ref.Ref(Canvas).pipe(FormInputAnnotation.set(false)),
}).pipe(
  Annotation.IconAnnotation.set({ icon: 'ph--compass-tool--regular', hue: 'indigo' }),
  Type.makeObject(DXN.make('org.dxos.type.sketch', '0.1.0')),
);
export type Sketch = Type.InstanceType<typeof Sketch>;

export type SketchProps = Omit<Obj.MakeProps<typeof Sketch>, 'canvas'> & {
  canvas?: Partial<Obj.MakeProps<typeof Canvas>>;
};

export const make = ({ canvas: canvasProps, ...props }: SketchProps = {}) => {
  const { schema = TLDRAW_SCHEMA, content = {} } = canvasProps ?? {};
  const canvas = Obj.make(Canvas, { schema, content });
  return Obj.make(Sketch, { ...props, canvas: Ref.make(canvas) });
};

/**
 * Type guard for {@link Sketch} objects. `Obj.instanceOf` is typename-aware so
 * another plugin can share the structural shape (`name` + `canvas` ref — e.g. the
 * excalidraw plugin's own `Excalidraw` type) without false-positively matching
 * as a Sketch at the surface filter.
 */
export const isSketch = (object: any, _schema?: string): object is Sketch => Obj.instanceOf(Sketch, object);
