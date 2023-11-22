//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { Chain, type ChainDocument, type ChainOptions, ChainResources } from './chain';
import { getConfig, getKey } from '../../../util';

const docs: ChainDocument[] = [
  {
    metadata: { id: 'doc-1' },
    pageContent: 'DXOS consists of HALO, ECHO and MESH.',
  },
  {
    metadata: { id: 'doc-2' },
    pageContent: 'HALO is a mechanism for self-sovereign identity.',
  },
  {
    metadata: { id: 'doc-3' },
    pageContent: 'ECHO is a decentralized graph database.',
  },
  {
    metadata: { id: 'doc-4' },
    pageContent: 'MESH provides infrastructure for resilient peer-to-peer networks.',
  },
];

// TODO(burdon): Use fakes for testing?

describe('Chain', () => {
  const baseDir = '/tmp/dxos/agent/functions/chat/chain';
  const getOptions = (options: Partial<ChainOptions> = {}) => {
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

  test('chat', async () => {
    {
      const resources = new ChainResources(getOptions());
      await resources.initialize();
      await resources.addDocuments(docs);

      const chain = new Chain(resources);
      {
        const result = await chain.call('what kind of database does DXOS use?');
        console.log(`> ${result}`);
      }
      {
        const result = await chain.call('what is HALO part of?');
        console.log(`> ${result}`);
      }
      {
        const result = await chain.call('what language is MESH written in?');
        console.log(`> ${result}`);
      }
    }
  });
}).timeout(60_000);
