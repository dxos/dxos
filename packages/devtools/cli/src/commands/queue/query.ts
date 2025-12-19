//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ClientService } from '@dxos/client';
import { type Queue } from '@dxos/client/echo';
import { DXN } from '@dxos/keys';

import { CommandConfig } from '../../services';
import { printList } from '../../util';

import { printQueueObject } from './util';

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
    const { json } = yield* CommandConfig;
    const client = yield* ClientService;
    const queue = (yield* Effect.promise(() => client.graph.createRefResolver({}).resolve(dxn))) as Queue<any>;
    const objects = yield* Effect.promise(() => queue.queryObjects());

    if (json) {
      yield* Console.log(JSON.stringify(objects, null, 2));
    } else {
      // TODO(wittjosiah): Interactive table of results.
      const formatted = objects.map(printQueueObject);
      yield* Console.log(printList(formatted));
    }
  }),
).pipe(Command.withDescription('Query objects in a queue.'));
