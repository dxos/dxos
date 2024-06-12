//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';

export class SketchContent extends TypedObject({ typename: 'dxos.org/type/SketchContent', version: '0.1.0' })({
  content: S.String,
}) {}

export class SketchType extends TypedObject({ typename: 'dxos.org/type/Sketch', version: '0.1.0' })({
  title: S.optional(S.String),
  data: ref(SketchContent),
}) {}
