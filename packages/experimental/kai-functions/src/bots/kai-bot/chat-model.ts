//
// Copyright 2023 DXOS.org
//

import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';

import { log } from '@dxos/log';

export type ChatModelOptions = {
  orgId: string;
  apiKey: string;
  model?: string;
};

/**
 * GPT Chat Completion uses a prior set of messages as context to generate the next completion.
 * The maximum token count for these context messages is 4096.
 *
 * https://chat.openai.com/chat
 *
 * NOTE: The current (2023-03-02) cost model is $0.002 per 1000 tokens (roughly 1c per large query).
 * We are being billed for this -- use with caution.
 */
export class ChatModel {
  private readonly _api: OpenAIApi;

  constructor(private readonly _options: ChatModelOptions) {
    // https://beta.openai.com/docs/api-reference/authentication
    const configuration = new Configuration({
      organization: this._options.orgId,
      apiKey: this._options.apiKey,
    });

    // Hack to workaround error when running in browser: Refused to set unsafe header "User-Agent".
    delete configuration.baseOptions.headers['User-Agent'];

    // https://www.npmjs.com/package/openai
    this._api = new OpenAIApi(configuration);
  }

  async request(messages: ChatCompletionRequestMessage[]): Promise<ChatCompletionRequestMessage | undefined> {
    try {
      // https://platform.openai.com/docs/guides/chat
      const response = await this._api.createChatCompletion({
        model: this._options.model ?? 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'you are a helpful assistant.',
          },
          ...messages,
        ],
      });

      const {
        data: { usage, choices },
      } = response;
      log(JSON.stringify({ usage, choices: choices.length }));

      const [choice] = choices;
      return choice?.message;
    } catch (err: any) {
      log.error('request failed', err);
    }
  }
}
