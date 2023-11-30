//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { generator } from './knowledge';
import { getResources } from './testing';
import { type ChainDocument } from '../../../chain';

const docs: ChainDocument[] = [
  'DXOS consists of HALO, ECHO and MESH.',
  'HALO is a mechanism for self-sovereign identity.',
  'ECHO is a decentralized graph database.',
  'ECHO provides data consistency using the Automerge CRDT algorithms.',
  'MESH provides infrastructure for resilient peer-to-peer networks.',
].map((text, i) => ({
  metadata: { id: `doc-${i + 1}` },
  pageContent: text,
}));

describe.skip('knowledge', () => {
  test('add and remove documents', async () => {
    const resources = getResources();
    await resources.store.initialize();
    await resources.store.addDocuments(docs);
    expect(resources.store.info.documents).to.equal(docs.length);
    await resources.store.addDocuments(docs);
    expect(resources.store.info.documents).to.equal(docs.length);
    await resources.store.deleteDocuments(docs.slice(0, 2).map((doc) => doc.metadata));
    expect(resources.store.info.documents).to.equal(docs.length - 2);
  });

  test('load and save', async () => {
    {
      const resources = getResources();
      await resources.store.initialize();
      await resources.store.addDocuments(docs);
      expect(resources.store.info.documents).to.equal(docs.length);
      await resources.store.save();
    }

    {
      const resources = getResources();
      await resources.store.initialize();
      expect(resources.store.info.documents).to.equal(docs.length);
    }
  });

  test('chat', async () => {
    {
      const resources = getResources();
      await resources.store.initialize();
      await resources.store.addDocuments(docs);

      const sequence = generator(resources, () => ({}), { noTrainingData: true });
      const call = async (input: string) => {
        console.log(`\n> ${input}\n`);
        const result = await sequence.invoke(input);
        console.log(result);
        return result;
      };

      await call('what kind of database does DXOS use?');
      await call('what is HALO part of?');
      await call('what language is MESH written in?');
      await call('what are alternative CRDT systems to those used by ECHO?');
      await call('who is the prime minister of japan?');
    }
  }).timeout(60_000);
});
