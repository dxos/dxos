//
// Copyright 2023 DXOS.org
//

import type { BaseChatModel } from 'langchain/chat_models/base';
import { FakeListChatModel } from 'langchain/chat_models/fake';
import { ChatOpenAI } from 'langchain/chat_models/openai';

import { getConfig, getKey } from '../../../util';

// TODO(burdon): Rethink test suites.
export class TestBuilder {
  model: BaseChatModel = new FakeListChatModel({ responses: ['fake response!'] });

  init() {
    const config = getConfig(`${process.env.HOME}/.config/dx/profile/default.yml`)!;
    this.model = new ChatOpenAI({
      temperature: 0.9,
      openAIApiKey: getKey(config, 'openai.com/api_key')!,
    });

    return this;
  }
}
