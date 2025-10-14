//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

export const TLDRAW_SCHEMA = 'tldraw.com/2';

export const CanvasType = Schema.Struct({
  id: Schema.String,
  /** Fully qualified external schema reference. */
  schema: Schema.optional(Schema.String),
  content: Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.Any })),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Canvas',
    version: '0.1.0',
  }),
);
export interface CanvasType extends Schema.Schema.Type<typeof CanvasType> {}

export const DiagramType = Schema.Struct({
  name: Schema.optional(Schema.String),
  canvas: Type.Ref(CanvasType),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Diagram',
    version: '0.1.0',
  }),
);
export interface DiagramType extends Schema.Schema.Type<typeof DiagramType> {}

export const isDiagramType = (object: any, schema: string): object is DiagramType =>
  Schema.is(DiagramType)(object) && object.canvas.target?.schema === schema;
