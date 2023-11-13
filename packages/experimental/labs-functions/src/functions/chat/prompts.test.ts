//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { type BaseChatModel } from 'langchain/chat_models/base';
import { FakeListChatModel } from 'langchain/chat_models/fake';
import { ChatOpenAI } from 'langchain/chat_models/openai';

import { describe, test } from '@dxos/test';

import { type Schema, prompts } from './prompts';
import { getConfig, getKey } from '../../util';

describe('Prompts', () => {
  // TODO(burdon): Testing.
  let model: BaseChatModel = new FakeListChatModel({ responses: ['fake response!'] });

  beforeEach(() => {
    const config = getConfig(`${process.env.HOME}/.config/dx/profile/default.yml`)!;
    model = new ChatOpenAI({
      temperature: 0.9,
      openAIApiKey: getKey(config, 'openai.com/api_key')!,
    });
  });

  test('json', async () => {
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

    const f = prompts[0];
    const messages = f({ message: 'List the 3 most popular open source projects that implement CRDTs.', schema });
    expect(messages).to.have.length.greaterThan(1);
    const result = await model.predictMessages(messages!);
    console.log(JSON.stringify(JSON.parse(result.content), undefined, 2));
  });

  test.skip('chess', async () => {
    const f = prompts[1];
    const messages = f({ message: 'Suggest the next move.', context: { pgn: '1. e4 e5' } });
    expect(messages).to.have.length.greaterThan(1);
    const result = await model.predictMessages(messages!);
    console.log(result.content);
  });
});
