//
// Copyright 2023 DXOS.org
//

import { type BaseChatModel } from 'langchain/chat_models/base';
import { FakeListChatModel } from 'langchain/chat_models/fake';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { ChatMessage } from 'langchain/schema';

import { describe, test } from '@dxos/test';

import { getConfig, getKey } from '../../util';

type Schema = {
  fields: {
    name: string;
    description?: string;
    type: 'string' | 'number';
  }[];
};

describe('Langchain', () => {
  // TODO(burdon): Testing.
  let model: BaseChatModel = new FakeListChatModel({ responses: ['fake response!'] });

  beforeEach(() => {
    const config = getConfig(`${process.env.HOME}/.config/dx/profile/default.yml`)!;
    model = new ChatOpenAI({
      temperature: 0.9,
      openAIApiKey: getKey(config, 'openai.com/api_key')!,
    });
  });

  test.skip('json', async () => {
    // TODO(burdon): Schema format via function calling (ChatGPT only).
    // https://community.openai.com/t/getting-response-data-as-a-fixed-consistent-json-response/28471/32
    const f = (schema: Schema) => {
      return [
        new ChatMessage('You are a helpful assistant.', 'system'),
        new ChatMessage(
          [
            'You are a machine that only returns and replies with valid, iterable RFC8259 compliant JSON in your responses',
            `Each item should contain the following fields: ${schema.fields.map(({ name }) => name).join(',')}.`,
            ...schema.fields
              .map(({ name, description }) => description && `The field "${name}" should be the ${description}`)
              .filter(Boolean),
          ].join(' '),
          'user',
        ),
        new ChatMessage('List the 3 most popular open source projects that implement CRDTs.', 'user'),
      ];
    };

    // TODO(burdon): App should allow prompt tuning. Associated with schema?
    const schema: Schema = {
      fields: [
        {
          name: 'name',
          type: 'string',
        },
        {
          name: 'description',
          description: 'Short summary',
          type: 'string',
        },
        {
          name: 'website',
          description: 'Web site URL (not github)',
          type: 'string',
        },
        {
          name: 'repo',
          description: 'Github repo URL',
          type: 'string',
        },
      ],
    };

    const result = await model.predictMessages(f(schema));
    console.log(JSON.stringify(JSON.parse(result.content), undefined, 2));
  });

  test.skip('chess', async () => {
    // TODO(burdon): Client should provide prompt context.
    const f = (object: { pgn: string }) => {
      return [
        new ChatMessage('You are a helpful assistant.', 'system'),
        new ChatMessage(['I am currently playing chess.', `The move history is ${object.pgn}`].join(' '), 'user'),
        new ChatMessage('Suggest the next move.', 'user'),
      ];
    };

    const result = await model.predictMessages(f({ pgn: '1. e4 e5' }));
    console.log(result.content);
  });
});
