//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { FakeEmbeddings } from 'langchain/embeddings/fake';

import { describe, test } from '@dxos/test';

import { VectorStoreImpl } from './store';

describe('store', () => {
  test.only('add', async () => {
    const store = new VectorStoreImpl(new FakeEmbeddings());
    await store.initialize();
    await store.addDocuments([
      {
        metadata: { id: '1' },
        pageContent: 'hello world',
      },
      {
        metadata: { id: '2' },
        pageContent: 'hello world',
      },
    ]);
    expect(store.stats.documents).to.eq(2);
  });
});
