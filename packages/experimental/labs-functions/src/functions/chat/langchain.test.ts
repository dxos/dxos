//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { type Document } from 'langchain/document';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

import { describe, test } from '@dxos/test';

import { getConfig, getKey } from '../../util';

const docs: Document[] = [
  {
    metadata: { id: 1 },
    pageContent: 'it was the best of times',
  },
  {
    metadata: { id: 2 },
    pageContent: 'it was the worst of times',
  },
  {
    metadata: { id: 3 },
    pageContent: 'it was the age of wisdom',
  },
  {
    metadata: { id: 4 },
    pageContent: 'it was the age of foolishness',
  },
];

describe('langchain', () => {
  test('vector', async () => {
    const config = getConfig()!;

    // TODO(burdon): CloudflareWorkersAIEmbeddings, FakeEmbeddings for tests.
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: getKey(config, 'openai.com/api_key'),
    });

    const vectorStore = new MemoryVectorStore(embeddings);
    await vectorStore.addDocuments(docs);
    expect(vectorStore.memoryVectors.length).to.equal(docs.length);

    const results = await vectorStore.similaritySearchWithScore('the ages', 2);
    expect(results.map(([document]) => document.metadata.id)).to.deep.eq([3, 4]);
  });
});
