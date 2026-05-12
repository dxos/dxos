//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';

import { Operation } from '@dxos/compute';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

import { InboxOperation } from '../types';
import { renderMarkdown } from '../util';

const handler: Operation.WithHandler<typeof InboxOperation.ReadEmail> = InboxOperation.ReadEmail.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ mailbox: mailboxRef, skip = 0, limit = 20 }) {
      const mailbox = yield* Database.load(mailboxRef);
      const feed = yield* Database.load(mailbox.feed);
      const objects = yield* Feed.runQuery(feed, Filter.type(Message.Message));
      const content = Function.pipe(
        objects,
        Array.reverse,
        Array.drop(skip),
        Array.take(limit),
        Array.filter((message) => Obj.instanceOf(Message.Message, message)),
        Array.flatMap(renderMarkdown),
        Array.join('\n\n'),
      );
      return { content };
    }),
  ),
);

export default handler;
