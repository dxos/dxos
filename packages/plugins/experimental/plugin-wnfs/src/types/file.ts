//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

export class FileType extends TypedObject({ typename: 'dxos.org/type/File', version: '0.1.0' })({
  name: S.optional(S.String),
  type: S.String,
  cid: S.String,
  timestamp: S.optional(S.String),
}) {}
