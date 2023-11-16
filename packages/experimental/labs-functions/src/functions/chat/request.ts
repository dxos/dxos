//
// Copyright 2023 DXOS.org
//

import { type ChatCompletionRequestMessage } from 'openai';

import { type Thread } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { Schema, type TypedObject } from '@dxos/echo-schema';

import { addPrompt } from './prompts';

export const createRequest = (space: Space, block: Thread.Block): ChatCompletionRequestMessage[] => {
  const message = block.messages
    .map((message) => message.text)
    .filter(Boolean)
    .join('\n');

  let context: TypedObject | undefined;
  if (block?.context.object) {
    const { objects } = space.db.query({ id: block.context.object });
    context = objects[0];
  }

  // TODO(burdon): Expect client to set schema.
  let schema: Schema | undefined;
  if (context?.__typename === 'braneframe.Grid') {
    schema = new Schema({
      typename: 'example.com/schema/project',
      props: [
        {
          id: 'name',
          type: Schema.PropType.STRING,
        },
        {
          id: 'description',
          description: 'Short summary',
          type: Schema.PropType.STRING,
        },
        {
          id: 'website',
          description: 'Web site URL (not github)',
          type: Schema.PropType.STRING,
        },
        {
          id: 'repo',
          description: 'Github repo URL',
          type: Schema.PropType.STRING,
        },
      ],
    });
  }

  const messages = addPrompt({ message, context, schema })!;

  // TODO(burdon): Temp convert longchain messages to ChatCompletionRequestMessage.
  return messages.map(({ role, content }) => ({ role, content } as ChatCompletionRequestMessage));
};
