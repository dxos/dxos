//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

export class FileType extends TypedObject({ typename: 'dxos.org/type/File', version: '0.1.0' })({
  filename: S.String,
  type: S.String,
  timestamp: S.optional(S.String),
  title: S.optional(S.String),
  cid: S.optional(S.String),
}) {}
