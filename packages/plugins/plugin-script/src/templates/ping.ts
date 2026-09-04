//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/keys';

const Ping = Operation.make({
  meta: {
    key: DXN.make('com.example.operation.script.ping'),
    name: 'Ping',
  },
  input: Schema.Any,
  output: Schema.Any,
});

export default Ping.pipe(
  Operation.withHandler(
    Effect.fn(function* (data) {
      return data;
    }),
  ),
);
