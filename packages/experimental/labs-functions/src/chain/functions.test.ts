//
// Copyright 2024 DXOS.org
//

import { type BaseFunctionCallOptions } from '@langchain/core/language_models/base';
import { OllamaFunctions } from 'langchain/experimental/chat_models/ollama_functions';

import { describe, test } from '@dxos/test';

describe.only('Functions', () => {
  test('simple', async () => {
    const model = new OllamaFunctions({
      temperature: 0.1,
      model: 'mistral',
    });

    const options: BaseFunctionCallOptions = {
      functions: [
        {
          name: 'get_current_weather',
          description: 'Get the weather in a given location.',
          parameters: {
            type: 'object',
            // TODO(burdon): JSON Schema.
            properties: {
              time: {
                type: 'string',
                description: 'The city and state, e.g. San Francisco, CA',
              },
            },
            required: ['time'],
          },
        },
        {
          name: 'locator',
          description: 'Get the current location.',
          parameters: {
            type: 'null',
          },
        },
      ],
    };

    const result = await model.bind(options).invoke('Where am i?');
    console.log('>>', result);
  });
});
