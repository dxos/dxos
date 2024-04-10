//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { TypedObject } from '@dxos/echo-schema';

export class FileType extends TypedObject({ typename: 'braneframe.File', version: '0.1.0' })({
  filename: S.string,
  type: S.string,
  timestamp: S.optional(S.string),
  title: S.optional(S.string),
  cid: S.optional(S.string),
}) {}
