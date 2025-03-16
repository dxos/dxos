//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';

export class Log extends S.TaggedClass<Log>()('dxos.org/test/logger/log', {
  input: S.Struct({
    message: S.String,
  }),
  output: S.Void,
}) {}
