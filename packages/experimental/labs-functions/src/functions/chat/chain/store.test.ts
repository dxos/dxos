//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';
import { FakeEmbeddings } from 'langchain/embeddings/fake';

import { describe, test } from '@dxos/test';

import { ChainStore } from './store';

describe('store', () => {
  test('add', async () => {
    const documents = [
      {
        metadata: { id: 'doc-1' },
        pageContent: 'it was the best of times',
      },
      {
        metadata: { id: 'doc-2' },
        pageContent: 'it was the worst of times',
      },
    ];

    const store = new ChainStore(new FakeEmbeddings());
    await store.initialize();
    await store.addDocuments([documents[0]]);
    expect(store.stats.documents).to.eq(1);
    expect(await store.hasDocument(documents[0])).to.be.true;
    expect(await store.hasDocument(documents[1])).to.be.false;
  });
});
