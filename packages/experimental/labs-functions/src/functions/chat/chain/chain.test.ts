//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Chain } from './chain';
import { type ChainResourcesOptions } from './resources';
import { type ChainDocument } from './store';
import { createOpenAIChainResources, createOllamaChainResources } from './vendors';
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

describe.skip('Chain', () => {
  const getResources = (type = 'openai', options: Partial<ChainResourcesOptions<any, any>> = {}) => {
    const config = getConfig()!;

    switch (type) {
      case 'openai':
        return createOpenAIChainResources({
          baseDir: '/tmp/dxos/agent/functions/chat/chain/openai',
          apiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key')!,
          chat: {
            temperature: 0,
            modelName: 'gpt-3.5-turbo-1106',
            // modelName: 'gpt-4',
          },
          ...options,
        });

      case 'ollama':
        return createOllamaChainResources({
          baseDir: '/tmp/dxos/agent/functions/chat/chain/ollama',
          chat: {
            temperature: 0,
            model: 'llama2',
          },
          ...options,
        });

      default:
        throw new Error(`Invalid type: ${type}`);
    }
  };

  test('add and remove documents', async () => {
    const resources = getResources();
    await resources.store.initialize();
    await resources.store.addDocuments(docs);
    expect(resources.store.stats.documents).to.equal(docs.length);
    await resources.store.addDocuments(docs);
    expect(resources.store.stats.documents).to.equal(docs.length);
    await resources.store.deleteDocuments(docs.slice(0, 2).map((doc) => doc.metadata));
    expect(resources.store.stats.documents).to.equal(docs.length - 2);
  });

  test('load and save', async () => {
    {
      const resources = getResources();
      await resources.store.initialize();
      await resources.store.addDocuments(docs);
      expect(resources.store.stats.documents).to.equal(docs.length);
      await resources.store.save();
    }

    {
      const resources = getResources();
      await resources.store.initialize();
      expect(resources.store.stats.documents).to.equal(docs.length);
    }
  });

  test('chat', async () => {
    {
      const resources = getResources();
      await resources.store.initialize();
      await resources.store.addDocuments(docs);

      const chain = new Chain(resources, { context: false });
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
  }).timeout(60_000);
});
