//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';

export const TLDRAW_SCHEMA_VERSION = 'tldraw.com/schema/Canvas/2';

export class CanvasType extends TypedObject({ typename: 'dxos.org/type/Canvas', version: '0.1.0' })({
  /** External Schema Identifier (e.g., "tldraw.com/2") */
  schema: S.optional(S.String),
  content: S.mutable(S.Record(S.String, S.Any)),
}) {}

export class DiagramType extends TypedObject({ typename: 'dxos.org/type/Diagram', version: '0.1.0' })({
  name: S.optional(S.String),
  canvas: ref(CanvasType),
}) {}
