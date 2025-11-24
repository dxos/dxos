//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';

export const TLDRAW_SCHEMA = 'tldraw.com/2';

export const Canvas = Schema.Struct({
  /** Fully qualified external schema reference. */
  // TODO(wittjosiah): Remove once the schema is fully internalized.
  schema: Schema.String.pipe(Schema.optional),
  content: Schema.Record({ key: Schema.String, value: Schema.Any }).pipe(Schema.mutable),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Canvas',
    version: '0.1.0',
  }),
  Annotation.SystemTypeAnnotation.set(true),
);

export interface Canvas extends Schema.Schema.Type<typeof Canvas> {}

export const Diagram = Schema.Struct({
  name: Schema.String.pipe(Schema.optional),
  canvas: Type.Ref(Canvas).pipe(Annotation.FormInputAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Diagram',
    version: '0.1.0',
  }),
);

export interface Diagram extends Schema.Schema.Type<typeof Diagram> {}

export type DiagramProps = Omit<Obj.MakeProps<typeof Diagram>, 'canvas'> & {
  canvas?: Partial<Obj.MakeProps<typeof Canvas>>;
};

export const make = ({ canvas: canvasProps, ...props }: DiagramProps = {}) => {
  const { schema = TLDRAW_SCHEMA, content = {} } = canvasProps ?? {};
  const canvas = Obj.make(Canvas, { schema, content });
  return Obj.make(Diagram, { ...props, canvas: Ref.make(canvas) });
};

export const isDiagram = (object: any, schema: string): object is Diagram =>
  Schema.is(Diagram)(object) && object.canvas.target?.schema === schema;
