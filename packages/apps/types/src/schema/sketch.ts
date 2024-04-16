//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';

export class SketchType extends TypedObject({ typename: 'braneframe.Sketch', version: '0.1.0' })({
  title: S.optional(S.string),
  data: E.ref(E.Expando),
}) {}
