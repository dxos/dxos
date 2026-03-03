//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

export class Log extends Schema.TaggedClass<Log>()('dxos.org/test/logger/log', {
  input: Schema.Struct({
    message: Schema.String,
  }),
  output: Schema.Void,
}) {}

export const LogOperation = Operation.make({
  meta: { key: 'dxos.org/test/logger/log', name: 'Log' },
  schema: {
    input: Schema.Struct({ message: Schema.String }),
    output: Schema.Void,
  },
});
