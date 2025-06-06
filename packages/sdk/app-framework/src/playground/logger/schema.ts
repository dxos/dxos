//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

export class Log extends Schema.TaggedClass<Log>()('dxos.org/test/logger/log', {
  input: Schema.Struct({
    message: Schema.String,
  }),
  output: Schema.Void,
}) {}
