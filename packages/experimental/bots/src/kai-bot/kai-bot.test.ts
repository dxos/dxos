//
// Copyright 2023 DXOS.org
//

import fs from 'fs';
import yaml from 'js-yaml';
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai';
import path from 'path';

import { Config } from '@dxos/config';
import { describe, test } from '@dxos/test';

// TODO(burdon): Env vars: OPENAI_ORG_ID, OPENAI_API_KEY.
const config = new Config(
  yaml.load(String(fs.readFileSync(path.join(process.cwd(), './packages/experimental/bots/config.yml')))) as any
);

// TODO(burdon): Move to config.
const getKey = (config: Config, name: string) => {
  const keys = config.values?.runtime?.keys;
  const key = keys?.find((key) => key.name === name);
  return key?.value;
};

/**
 *
 */
class ChatModel {
  constructor(private readonly _api: OpenAIApi, private readonly _model: string) {}

  // TODO(burdon): Whisper?
  // TODO(burdon): Track tokens.

  // TODO(burdon): Remove from the context any bad answers or prompts. Clip previous tokens.

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
    // https://beta.openai.com/docs/api-reference/authentication
    const configuration = new Configuration({
      organization: getKey(config, 'openai.org_id'),
      apiKey: getKey(config, 'openai.api_key')
    });

    // https://www.npmjs.com/package/openai
    const openai = new OpenAIApi(configuration);

    // https://platform.openai.com/docs/models/gpt-3-5
    const chat = new ChatModel(openai, 'gpt-3.5-turbo');
    await chat.request([
      {
        role: 'user',
        content: 'i hava a meeting with Alex Brunicki.'
      },
      {
        role: 'user',
        content: 'Alex Brunicki works for Backed VC.'
      },
      {
        role: 'user',
        content: 'write a short summary about Backed VC.'
      },
      {
        role: 'assistant',
        content:
          'Backed VC is a venture capital firm that provides seed and early-stage funding to startups in Europe. They primarily focus on the fintech, proptech, and health sectors. Backed VC is known for their collaborative investment approach, which involves working closely with founders to help them achieve their goals. They also offer hands-on support and resources to their portfolio companies, such as a network of experienced mentors and industry experts to provide guidance and advice. Overall, Backed VC is dedicated to helping innovative startups grow and thrive.'
      },
      {
        role: 'user',
        content: 'write a short bio about Alex Brunicki.'
      },
      {
        role: 'assistant',
        content:
          "Alex Brunicki is a Partner at Backed VC, based in London, UK. With over 10 years of experience in the investment industry, Alex has a deep understanding of the European startup ecosystem, and is passionate about supporting innovative founders and their companies. Prior to joining Backed VC, Alex was an Associate Director at Rothschild & Co, where he advised on a number of high-profile M&A transactions. He holds a Master's degree in Economics from the University of Cambridge, and a Bachelor's degree in Philosophy, Politics and Economics from the University of Warwick. In his current role, Alex focuses on investments in fintech and proptech sectors, and is actively involved in the firm's portfolio companies, providing strategic guidance and support."
      },
      {
        role: 'user',
        content: 'list the names of the executives at Backed VC' // TODO(burdon): Output
      },
      {
        role: 'assistant',
        content:
          'The current executives at Backed VC are:\n\n1. Andrei Brasoveanu - Managing Partner\n2. Alex Brunicki - Partner\n3. Ahti Heinla - Partner\n4. Isabel Bescos - Venture Partner\n5. Charles Delingpole - Venture Partner'
      },
      {
        role: 'user',
        content: 'list the 10 major investments of Backed VC.'
      },
      {
        role: 'assistant',
        content:
          'Here are 10 major investments made by Backed VC:\n\n1. Curve - A fintech startup that provides a single card for all your bank cards. Backed VC invested in Curve in 2016.\n2. Viz.ai - A healthcare startup that uses AI to identify and treat strokes. Backed VC invested in Viz.ai in 2016.\n3. Winnow - A proptech startup that helps commercial kitchens reduce food waste. Backed VC invested in Winnow in 2017.\n4. Clutter - A storage startup that offers on-demand storage solutions. Backed VC invested in Clutter in 2017.\n5. Chainalysis - A blockchain intelligence startup that helps identify illicit activity. Backed VC invested in Chainalysis in 2018.\n6. Passion Capital - A venture capital firm that invests in early-stage startups. Backed VC invested in Passion Capital in 2018.\n7. Tide - A fintech startup that provides business banking services. Backed VC invested in Tide in 2018.\n8. TourRadar - A travel booking platform that specializes in multi-day tours. Backed VC invested in TourRadar in 2018.\n9. GoStudent - An edtech platform that connects students with online tutors. Backed VC invested in GoStudent in 2019.\n10. Starling Bank - A digital bank that offers personal and business banking services. Backed VC invested in Starling Bank in 2019.'
      }
    ]);
  });
});
