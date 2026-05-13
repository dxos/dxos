//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig, printList } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { type Queue } from '@dxos/client/echo';
import { EchoId } from '@dxos/keys';

import { printQueueObject } from './util';

export const query = Command.make(
  'query',
  {
    dxn: Options.text('dxn').pipe(Options.withDescription('DXN of the queue.')),
  },
  Effect.fnUntraced(function* ({ dxn }) {
    const { json } = yield* CommandConfig;
    const client = yield* ClientService;
    const queue = (yield* Effect.promise(() =>
      client.graph.createRefResolver({}).resolve(EchoId.parse(dxn)),
    )) as Queue<any>;
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
