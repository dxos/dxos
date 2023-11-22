//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Chain } from './chain';
import { type ChainDocument, type ChainResourcesOptions, ChainResources } from './resources';
import { getConfig, getKey } from '../../../util';

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

// TODO(burdon): Use fakes for testing?

describe('Chain', () => {
  const baseDir = '/tmp/dxos/agent/functions/chat/chain';
  const getOptions = (options: Partial<ChainResourcesOptions> = {}) => {
    const config = getConfig()!;
    return {
      apiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key')!,
      chat: { modelName: 'gpt-4' },
      ...options,
    };
  };

  test('add and remove documents', async () => {
    const resources = new ChainResources(getOptions());
    await resources.initialize();
    await resources.addDocuments(docs);
    expect(resources.stats.documents).to.equal(docs.length);
    await resources.addDocuments(docs);
    expect(resources.stats.documents).to.equal(docs.length);
    await resources.deleteDocuments(docs.slice(0, 2).map((doc) => doc.metadata));
    expect(resources.stats.documents).to.equal(docs.length - 2);
  });

  test('load and save', async () => {
    {
      const resources = new ChainResources(getOptions({ baseDir }));
      await resources.initialize();
      await resources.addDocuments(docs);
      expect(resources.stats.documents).to.equal(docs.length);
      await resources.save();
    }

    {
      const resources = new ChainResources(getOptions({ baseDir }));
      await resources.initialize();
      expect(resources.stats.documents).to.equal(docs.length);
    }
  });

  test
    .only('chat', async () => {
      {
        const resources = new ChainResources(getOptions());
        await resources.initialize();
        await resources.addDocuments(docs);

        const chain = new Chain(resources, { precise: false });
        const call = async (input: string) => {
          const result = await chain.call(input);
          console.log(`\n> ${input}`);
          console.log(result);
          return result;
        };

        await call('what kind of database does DXOS use?');
        await call('what is HALO part of?');
        await call('what language is MESH written in?');
        await call('what are alternative CRDT systems to those used by ECHO?');
        await call('who is the prime minister of japan?');
      }
    })
    .timeout(60_000);
});
