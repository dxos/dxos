//
// Copyright 2023 DXOS.org
//

import { Config } from '@dxos/config';
import { describe, test } from '@dxos/test';

import { getConfig, loadJson } from '../util';
import { ChatModel } from './chat-model';

// TODO(burdon): Move to config.
const getKey = (config: Config, name: string) => {
  const keys = config.values?.runtime?.keys;
  const key = keys?.find((key) => key.name === name);
  return key?.value;
};

describe('openai', () => {
  const createChatModel = (): ChatModel => {
    const config = getConfig()!;
    return new ChatModel({
      organization: getKey(config, 'openai.org_id')!,
      apiKey: getKey(config, 'openai.api_key')!
    });
  };

  // eslint-disable-next-line mocha/no-skipped-tests
  test.skip('basic', async () => {
    const chat = createChatModel();
    const { messages } = loadJson('packages/experimental/bots/data/messages.json');
    await chat.request(messages);
  });
});
