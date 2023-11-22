//
// Copyright 2023 DXOS.org
//

import { type ChatMessage } from 'langchain/schema';

import { type Message as MessageType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { Schema, type TypedObject } from '@dxos/echo-schema';

import { createPrompt } from './prompts';

export const createRequest = (space: Space, message: MessageType): ChatMessage[] => {
  const text = message.blocks
    .map((message) => message.text)
    .filter(Boolean)
    .join('\n');

  let context: TypedObject | undefined;
  if (message?.context.object) {
    const { objects } = space.db.query({ id: message.context.object });
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

  return createPrompt({ message: text, context, schema })!;
};
