//
// Copyright 2023 DXOS.org
//

import { type ChatCompletionRequestMessage } from 'openai';

import { type Thread } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { Schema, type TypedObject } from '@dxos/echo-schema';

import { defaultPrompt, prompts } from './prompts';

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
  if (context?.__typename === 'braneframe.Grid.Item') {
    schema = new Schema({
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

  let messages = defaultPrompt({ message })!;
  for (const prompt of prompts) {
    const m = prompt({ message, context, schema });
    if (m) {
      messages = m;
      break;
    }
  }

  // TODO(burdon): Temp convert longchain messages to ChatCompletionRequestMessage.
  return messages.map(({ role, content }) => ({ role, content } as ChatCompletionRequestMessage));
};
