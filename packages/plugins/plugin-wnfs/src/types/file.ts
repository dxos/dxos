//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { TypedObject } from '@dxos/echo/internal';

export class FileType extends TypedObject({
  typename: 'dxos.org/type/File',
  version: '0.1.0',
})({
  name: Schema.optional(Schema.String),
  type: Schema.String,
  cid: Schema.String,
  timestamp: Schema.optional(Schema.String),
}) {}
