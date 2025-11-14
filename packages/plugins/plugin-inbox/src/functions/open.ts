//
// Copyright 2025 DXOS.org
//

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { DatabaseService, QueueService, defineFunction } from '@dxos/functions';
import { Message } from '@dxos/types';

import { Mailbox } from '../types';

export default defineFunction({
  key: 'dxos.org/function/inbox/email-open',
  name: 'Open email',
  description: 'Opens and reads the contents of an mailbox object.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the mailbox object.',
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
  handler: Effect.fn(function* ({ data: { id, skip = 0, limit = 20 } }) {
    const mailbox = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Mailbox.Mailbox);
    const { dxn } = yield* Effect.promise(() => mailbox.queue.load());
    const queue = yield* QueueService.getQueue(dxn);
    yield* Effect.promise(() => queue?.queryObjects());
    const content = Function.pipe(
      queue?.objects,
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

const renderMarkdown = (message: Message.Message): string[] => {
  const sender =
    message.sender.contact?.target?.fullName ??
    message.sender.name ??
    message.sender.email ??
    message.sender.identityDid;
  const blocks = message.blocks.filter((block) => block._tag === 'text');
  return [
    // prettier-ignore
    `###### ${sender}`,
    `*${message.created}*`,
    blocks.map((block) => block.text.trim()).join(' '),
    '',
  ];
};
