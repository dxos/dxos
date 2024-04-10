//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { EchoObjectSchema } from '@dxos/echo-schema';

export class MapType extends EchoObjectSchema({ typename: 'braneframe.Map', version: '0.1.0' })({
  title: S.optional(S.string),
}) {}
