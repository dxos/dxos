//
// Copyright 2023 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import path from 'path';

import { Config } from '@dxos/config';
import { describe, test } from '@dxos/test';

// TODO(burdon): Move to config.
const getKey = (config: Config, name: string) => {
  const keys = config.values?.runtime?.keys;
  const key = keys?.find((key) => key.name === name);
  return key?.value;
};

/**
 * GPT Chat Completion uses a prior set of messages as context to generate the next completion.
 * The maximum token count for these context messages is 4096.
 * The current (2023-03-02) cost model is $0.002 per 1000 tokens (roughly 1c per large query).
 * We are being billed for this -- use with caution.
 */
class ChatModel {
  constructor(private readonly _api: OpenAIApi, private readonly _model: string) {}

  // TODO(burdon): Remove from the context any bad answers or prompts. Clip previous tokens.
  // TODO(burdon): Coerce output format.

  async request(messages: ChatCompletionRequestMessage[]) {
    // https://platform.openai.com/docs/guides/chat
    const response = await this._api.createChatCompletion({
      model: this._model,

      // Example: Extract name and company from email/calendar event and create a Stack for the company.
      messages: [
        {
          role: 'system',
          content: 'you are a helpful assistant.'
        },
        ...messages
      ]
    });

    const { data } = response;
    // NOTE: id different each time (even for same input).
    const { usage, choices } = data;
    console.log(JSON.stringify({ usage }));

    choices.forEach(({ message: { role, content } = {} }) =>
      console.log(JSON.stringify({ role, content }, undefined, 2))
    );
  }
}

describe('openai', () => {
  // eslint-disable-next-line mocha/no-skipped-tests
  test('basic', async () => {
    const filename = path.join(process.cwd(), process.env.TEST_CONFIG ?? 'packages/experimental/bots/config.yml');
    if (!fs.existsSync(filename)) {
      return;
    }

    // https://beta.openai.com/docs/api-reference/authentication
    const config = new Config(yaml.load(String(fs.readFileSync(filename))) as any);
    const configuration = new Configuration({
      organization: getKey(config, 'openai.org_id'),
      apiKey: getKey(config, 'openai.api_key')
    });

    // https://www.npmjs.com/package/openai
    const openai = new OpenAIApi(configuration);

    // https://platform.openai.com/docs/models/gpt-3-5
    const chat = new ChatModel(openai, 'gpt-3.5-turbo');

    const { messages } = yaml.load(
      String(fs.readFileSync(path.join(process.cwd(), 'packages/experimental/bots/data/messages.json')))
    ) as any;
    await chat.request(messages);
  });
});
