//
// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';

export class FileType extends TypedObject({ typename: 'dxos.org/type/File', version: '0.1.0' })({
  filename: S.string,
  type: S.string,
  timestamp: S.optional(S.string),
  title: S.optional(S.string),
  cid: S.optional(S.string),
}) {}
