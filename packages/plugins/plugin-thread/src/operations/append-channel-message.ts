//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Feed, Obj } from '@dxos/echo';
import { createFeedServiceLayer } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Message } from '@dxos/types';

import { ThreadOperation } from '../types';

const handler: Operation.WithHandler<typeof ThreadOperation.AppendChannelMessage> =
  ThreadOperation.AppendChannelMessage.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ channel, sender, text }) {
        const db = Obj.getDatabase(channel);
        invariant(db, 'Database not found');
        const client = yield* Capability.get(ClientCapabilities.Client);
        const space = client.spaces.get(db.spaceId);
        invariant(space, 'Space not found');

        const feed = yield* Database.load(channel.feed);
        const message = Message.make({
          sender,
          blocks: [{ _tag: 'text', text }],
        });
        yield* Feed.append(feed, [message]).pipe(Effect.provide(createFeedServiceLayer(space.queues)));
      }),
    ),
  );

export default handler;
