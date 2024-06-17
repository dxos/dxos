//
// Copyright 2024 DXOS.org
//

import { ref, S, TypedObject } from '@dxos/echo-schema';

// TODO(wittjosiah): Track the version of tldraw schema (or in future json canvas schema).
//  Should the version of this type be the same as the version of the external schema?
export class CanvasType extends TypedObject({ typename: 'dxos.org/type/Canvas', version: '0.1.0' })({
  content: S.mutable(S.Record(S.String, S.Any)),
}) {}

export class SketchType extends TypedObject({ typename: 'dxos.org/type/Sketch', version: '0.1.0' })({
  name: S.optional(S.String),
  canvas: ref(CanvasType),
}) {}
