//
// Copyright 2023 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

import { Config } from '@dxos/config';
import { describe, test } from '@dxos/test';

import { ChatModel } from './chat-model';

// TODO(burdon): Move to config.
const getKey = (config: Config, name: string) => {
  const keys = config.values?.runtime?.keys;
  const key = keys?.find((key) => key.name === name);
  return key?.value;
};

describe('openai', () => {
  const createChatModel = (): ChatModel | undefined => {
    const filename = path.join(process.cwd(), process.env.TEST_CONFIG ?? 'packages/experimental/bots/config.yml');
    if (fs.existsSync(filename)) {
      const config = new Config(yaml.load(String(fs.readFileSync(filename))) as any);
      return new ChatModel({
        organization: getKey(config, 'openai.org_id')!,
        apiKey: getKey(config, 'openai.api_key')!
      });
    }
  };

  const loadJson = (filename: string) => {
    return yaml.load(String(fs.readFileSync(path.join(process.cwd(), filename)))) as any;
  };

  // eslint-disable-next-line mocha/no-skipped-tests
  test('basic', async () => {
    const chat = createChatModel();
    if (!chat) {
      return;
    }

    const { messages } = loadJson(path.join(process.cwd(), 'packages/experimental/bots/data/messages.json'));
    await chat.request(messages);
  });
});
