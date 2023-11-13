//
// Copyright 2023 DXOS.org
//

import { type ChatCompletionRequestMessage } from 'openai';

import { type Thread } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { type Schema, type TypedObject } from '@dxos/echo-schema';

export type SchemaConfig = {
  typename: string;
  fields: string[];
};

// TODO(burdon): Get schema from client.
const schemaConfigs: SchemaConfig[] = [
  {
    typename: 'braneframe.Grid.Item',
    fields: ['title', 'content'],
  },
];

const formatSchema = (schema: Schema) => {
  console.log(JSON.stringify(schema, undefined, 2));
  // const props =
  //   !config || config.fields.length === 0
  //     ? schema.props
  //     : schema.props.filter((prop) => config?.fields.includes(prop.id!));

  return `
    @type: ${schema.typename}
    fields:
      ${schema.props.map((prop) => `${prop.id}: ${prop.type}`).join('\n')}
    \n
  `;
};

export const createRequest = (space: Space, block: Thread.Block): ChatCompletionRequestMessage[] => {
  // TODO(burdon): Generate prompts.
  // TODO(burdon): Temp convert longchain messages to ChatCompletionRequestMessage.
  // TODO(burdon): Schema.

  let contextObject: TypedObject | undefined;
  if (block?.context.object) {
    const { objects } = space.db.query({ id: block.context.object });
    contextObject = objects[0];
  }

  const messages: ChatCompletionRequestMessage[] = [
    {
      role: 'system',
      content: 'you are a helpful assistant.',
    },
  ];

  block.messages.forEach((message) => {
    if (message.text) {
      messages.push({ role: 'user', content: message.text });
    }
  });

  return messages;
};
