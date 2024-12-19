//
// Copyright 2024 DXOS.org
//

import { Ref, S, TypedObject } from '@dxos/echo-schema';
import { ThreadType } from '@dxos/plugin-space';

// TODO(burdon): Move defs to plugin.
export const EXCALIDRAW_SCHEMA = 'excalidraw.com/2';
export const TLDRAW_SCHEMA = 'tldraw.com/2';

export class CanvasType extends TypedObject({ typename: 'dxos.org/type/Canvas', version: '0.1.0' })({
  /** Fully qualified external schema reference. */
  schema: S.optional(S.String),
  content: S.mutable(S.Record({ key: S.String, value: S.Any })),
}) {}

export class DiagramType extends TypedObject({ typename: 'dxos.org/type/Diagram', version: '0.1.0' })({
  name: S.optional(S.String),
  canvas: Ref(CanvasType),
  threads: S.optional(S.mutable(S.Array(Ref(ThreadType)))),
}) {}

export const isDiagramType = (object: any, schema: string): object is DiagramType =>
  object instanceof DiagramType && object.canvas.target?.schema === schema;
