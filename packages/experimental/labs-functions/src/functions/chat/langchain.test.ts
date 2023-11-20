//
// Copyright 2023 DXOS.org
//

import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

import { describe, test } from '@dxos/test';

import { getConfig, getKey } from '../../util';

describe.skip('langchain', () => {
  test('vector', async () => {
    const config = getConfig()!;
    const vectorStore = await MemoryVectorStore.fromTexts(
      ['Hello world', 'Bye bye', 'hello nice world'],
      [{ id: 2 }, { id: 1 }, { id: 3 }],
      new OpenAIEmbeddings({
        openAIApiKey: getKey(config, 'openai.com/api_key'),
      }),
    );

    const result = await vectorStore.similaritySearch('hello world', 1);
    console.log(result);
  });
});
