//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { CommandConfig, printList } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { createFeedServiceLayer } from '@dxos/client/echo';
import { Feed, Filter } from '@dxos/echo';
import { DXN, type SpaceId } from '@dxos/keys';

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
    const parts = dxn.asQueueDXN();
    if (!parts) {
      yield* Console.error(`Not a queue DXN: ${dxn.toString()}`);
      return;
    }
    const space = client.spaces.get(parts.spaceId as SpaceId);
    if (!space) {
      yield* Console.error(`Space not found: ${parts.spaceId}`);
      return;
    }
    const feed = Feed.unsafeFromQueueDXN(dxn);
    const objects = yield* Feed.runQuery(feed, Filter.everything()).pipe(
      Effect.provide(createFeedServiceLayer(space.queues)),
    );

    if (json) {
      yield* Console.log(JSON.stringify(objects, null, 2));
    } else {
      // TODO(wittjosiah): Interactive table of results.
      const formatted = objects.map(printQueueObject);
      yield* Console.log(printList(formatted));
    }
  }),
).pipe(Command.withDescription('Query objects in a queue.'));
