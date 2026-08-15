//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as OperationTag from '@dxos/app-toolkit/OperationTag';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

export class Log extends Schema.TaggedClass<Log>()('org.dxos.test.logger.log', {
  input: Schema.Struct({
    message: Schema.String,
  }),
  output: Schema.Void,
}) {}

export const LogOperation = Operation.make({
  meta: { key: DXN.make('org.dxos.test.logger.log'), name: 'Log', tags: [OperationTag.System] },
  input: Schema.Struct({ message: Schema.String }),
  output: Schema.Void,
});
