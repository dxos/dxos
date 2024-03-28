//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import * as E from '@dxos/echo-schema';
import { EchoObjectSchema } from '@dxos/echo-schema';

export class SketchType extends EchoObjectSchema({ typename: 'braneframe.Sketch', version: '0.1.0' })({
  title: S.optional(S.string),
  data: E.ref(E.AnyEchoObject),
}) {}
