//
// Copyright 2023 DXOS.org
//

import { Configuration, OpenAIApi } from 'openai';

import { describe, test } from '@dxos/test';

// TODO(burdon): Test from web.
// TODO(burdon): UX trigger.
// TODO(burdon): Project cards.
// TODO(burdon): Navigation: Calendar event => Person => Create Org (Blue Yard) => Magic.

describe('openai', () => {
  // eslint-disable-next-line mocha/no-skipped-tests
  test.skip('basic', async () => {
    // https://beta.openai.com/docs/api-reference/authentication
    const configuration = new Configuration({
      organization: process.env.OPENAI_ORG_ID,
      apiKey: process.env.OPENAI_API_KEY
    });

    // https://www.npmjs.com/package/openai
    const openai = new OpenAIApi(configuration);
    const response = await openai.listEngines();
    console.log(response.data);

    // TODO(burdon): Round off to sentence boundary.
    // https://beta.openai.com/docs/api-reference/completions
    // const completion = await openai.createCompletion({
    //   model: 'text-davinci-003',
    //   prompt: 'Describe Blueyard capital',
    //   max_tokens: 128
    // });

    // const { text } = completion.data.choices[0];
    // console.log(text?.trim());
  });
});
