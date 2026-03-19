//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/operation';

export class Log extends Schema.TaggedClass<Log>()('org.dxos.test.logger.log', {
  input: Schema.Struct({
    message: Schema.String,
  }),
  output: Schema.Void,
}) {}

export const LogOperation = Operation.make({
  meta: { key: 'org.dxos.test.logger.log', name: 'Log' },
  schema: {
    input: Schema.Struct({ message: Schema.String }),
    output: Schema.Void,
  },
});
