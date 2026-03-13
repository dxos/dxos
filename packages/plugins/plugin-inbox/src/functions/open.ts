//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { Message } from '@dxos/types';

import * as Mailbox from '../types/Mailbox';
import { renderMarkdown } from '../util';

export default defineFunction({
  key: 'org.dxos.function.inbox.email-open',
  name: 'Open email',
  description: 'Opens and reads the contents of a mailbox.',
  inputSchema: Schema.Struct({
    mailbox: Ref.Ref(Mailbox.Mailbox).annotations({
      description: 'Reference to the mailbox object.',
    }),
    skip: Schema.Number.pipe(
      Schema.annotations({
        description: 'The number of messages to skip.',
      }),
      Schema.optional,
    ),
    limit: Schema.Number.pipe(
      Schema.annotations({
        description: 'The maximum number of messages to read. Do not provide a value unless directly asked.',
      }),
      Schema.optional,
    ),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  types: [Feed.Feed, Mailbox.Mailbox],
  services: [Database.Service, Feed.Service],
  handler: Effect.fn(function* ({ data: { mailbox: mailboxRef, skip = 0, limit = 20 } }) {
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
});
