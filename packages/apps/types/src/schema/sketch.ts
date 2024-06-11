//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';

export class CanvasType extends TypedObject({ typename: 'dxos.org/type/Canvas', version: '0.1.0' })({
  content: S.String,
}) {}

export class SketchType extends TypedObject({ typename: 'dxos.org/type/Sketch', version: '0.1.0' })({
  name: S.optional(S.String),
  data: ref(CanvasType),
}) {}
