//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { Type } from '@dxos/echo';
import { TypedObject } from '@dxos/echo-schema';

export const TLDRAW_SCHEMA = 'tldraw.com/2';

export class CanvasType extends TypedObject({
  typename: 'dxos.org/type/Canvas',
  version: '0.1.0',
})({
  id: Schema.String,
  /** Fully qualified external schema reference. */
  schema: Schema.optional(Schema.String),
  content: Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.Any })),
}) {}

export class DiagramType extends TypedObject({
  typename: 'dxos.org/type/Diagram',
  version: '0.1.0',
})({
  name: Schema.optional(Schema.String),
  canvas: Type.Ref(CanvasType),
}) {}

export const isDiagramType = (object: any, schema: string): object is DiagramType =>
  Schema.is(DiagramType)(object) && object.canvas.target?.schema === schema;
