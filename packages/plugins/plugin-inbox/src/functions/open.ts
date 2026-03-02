//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { Database, Feed, Filter, Obj, Type } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';
import { Message } from '@dxos/types';

import { renderMarkdown } from '../util';

export default defineFunction({
  key: 'dxos.org/function/inbox/email-open',
  name: 'Open email',
  description: 'Opens and reads the contents of a mailbox feed.',
  inputSchema: Schema.Struct({
    feed: Type.Ref(Type.Feed).annotations({
      description: 'The ID of the mailbox feed.',
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
  services: [Database.Service, Feed.Service],
  handler: Effect.fn(function* ({ data: { feed: feedRef, skip = 0, limit = 20 } }) {
    const feed = yield* Database.load(feedRef);
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
