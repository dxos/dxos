//
// Copyright 2023 DXOS.org
//

import { Configuration, OpenAIApi } from 'openai';

import { describe, test } from '@dxos/test';

// TODO(burdon): 2023-01-16
// TODO(burdon): WARNING: This is a paid account. Move to env.
// https://beta.openai.com/account/api-keys
const ORG_ID = 'org-mZTRiNMMnvZWUqWxPlirjw5l';
const API_KEY = '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';

// TODO(burdon): Test from web.
// TODO(burdon): UX trigger.
// TODO(burdon): Project cards.
// TODO(burdon): Navigation: Calendar event => Person => Create Org (Blue Yard) => Magic.

describe('openai', () => {
  // eslint-disable-next-line mocha/no-skipped-tests
  test.skip('basic', async () => {
    // https://beta.openai.com/docs/api-reference/authentication
    const configuration = new Configuration({
      organization: ORG_ID,
      apiKey: API_KEY
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
