//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig, printList } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { Entity } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { printQueueObject } from './util';

export const query = Command.make(
  'query',
  {
    dxn: Options.text('dxn').pipe(Options.withDescription('DXN of the queue.')),
  },
  Effect.fnUntraced(function* ({ dxn }) {
    const { json } = yield* CommandConfig;
    const client = yield* ClientService;
    const echoUri = EID.tryParse(dxn);
    if (!echoUri) {
      yield* Console.error(`Not a valid feed identifier: ${dxn}`);
      return;
    }
    const spaceId = EID.getSpaceId(echoUri);
    if (!spaceId) {
      yield* Console.error(`Could not determine space from: ${dxn}`);
      return;
    }
    const space = client.spaces.get(spaceId);
    if (!space) {
      yield* Console.error(`Space not found: ${spaceId}`);
      return;
    }
    const queue = space.queues.get(echoUri);
    const objects = yield* Effect.promise(() => queue.queryObjects());

    if (json) {
      yield* Console.log(JSON.stringify(objects, null, 2));
    } else {
      // TODO(wittjosiah): Interactive table of results.
      const formatted = (objects as Entity.Any[]).map(printQueueObject);
      yield* Console.log(printList(formatted));
    }
  }),
).pipe(Command.withDescription('Query objects in a queue.'));
