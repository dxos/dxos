//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { type Queue } from '@dxos/client/echo';
import { DXN } from '@dxos/keys';

import { ClientService } from '../../services';

// TODO(dmaretskyi): Extract
const DXNSchema = Schema.String.pipe(
  Schema.transform(Schema.instanceOf(DXN), {
    decode: (value: string) => DXN.parse(value),
    encode: (value: DXN) => value.toString(),
  }),
);

export const query = Command.make(
  'query',
  {
    dxn: Options.text('dxn').pipe(Options.withDescription('DXN of the queue.'), Options.withSchema(DXNSchema)),
  },
  Effect.fnUntraced(function* ({ dxn }) {
    const client = yield* ClientService;
    const queue = (yield* Effect.promise(() => client.graph.createRefResolver({}).resolve(dxn))) as Queue<any>;
    const objects = yield* Effect.promise(() => queue.queryObjects());
    yield* Console.log(JSON.stringify(objects, null, 2));
  }),
).pipe(Command.withDescription('Query objects in a queue.'));
