//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

export class Log extends Schema.TaggedClass<Log>()('com.example.operation.appToolkit.log', {
  input: Schema.Struct({
    message: Schema.String,
  }),
  output: Schema.Void,
}) {}

export const LogOperation = Operation.make({
  meta: { key: DXN.make('com.example.operation.appToolkit.log'), name: 'Log' },
  input: Schema.Struct({ message: Schema.String }),
  output: Schema.Void,
});
