//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';

export const TLDRAW_SCHEMA = 'tldraw.com/2';

export class CanvasType extends TypedObject({ typename: 'dxos.org/type/Canvas', version: '0.1.0' })({
  /** Fully qualified external schema reference */
  schema: S.optional(S.String),
  // TODO(burdon): Default doesn't seem to work with create().
  content: S.mutable(S.Record(S.String, S.Any)).pipe(S.default({})),
}) {}

export class DiagramType extends TypedObject({ typename: 'dxos.org/type/Diagram', version: '0.1.0' })({
  name: S.optional(S.String),
  canvas: ref(CanvasType),
}) {}
