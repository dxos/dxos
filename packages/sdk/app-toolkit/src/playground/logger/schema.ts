//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

export class Log extends Schema.TaggedClass<Log>()('org.dxos.operation.test.logger.log', {
  input: Schema.Struct({
    message: Schema.String,
  }),
  output: Schema.Void,
}) {}

export const LogOperation = Operation.make({
  meta: { key: DXN.make('org.dxos.operation.test.logger.log'), name: 'Log' },
  input: Schema.Struct({ message: Schema.String }),
  output: Schema.Void,
});
