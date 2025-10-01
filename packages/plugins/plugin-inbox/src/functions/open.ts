//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { DatabaseService, QueueService, defineFunction } from '@dxos/functions';
import { DataType } from '@dxos/schema';

import { Mailbox } from '../types';

export default defineFunction({
  key: 'dxos.org/function/inbox/email-open',
  name: 'Open email',
  description: 'Opens and reads the contents of an mailbox object.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the mailbox object.',
    }),
  }),
  outputSchema: Schema.Struct({
    content: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { id } }) {
    const mailbox = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Mailbox.Mailbox);
    const { dxn } = yield* Effect.promise(() => mailbox.queue.load());
    const queue = yield* QueueService.getQueue(dxn);
    yield* Effect.promise(() => queue?.queryObjects());
    const content = queue?.objects
      .filter((message) => Obj.instanceOf(DataType.Message, message))
      .flatMap(renderMarkdown)
      .join('\n\n');
    return { content };
  }),
});

const renderMarkdown = (message: DataType.Message): string[] => {
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
