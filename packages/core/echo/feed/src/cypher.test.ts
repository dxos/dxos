//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';

import { type CypherContext } from './cypher';
import { createInMemoryKeyProvider, createWebCryptoCypher } from './web-crypto-cypher';

const CONTEXT: CypherContext = {
  feed: { spaceId: 'space-1', feedId: 'feed-1', feedNamespace: 'data' },
  blockId: 'feed-1:alice:0',
};

const PLAINTEXT = new Uint8Array([1, 2, 3, 4, 5]);

describe('WebCryptoCypher', () => {
  it('round-trips a payload', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    const sealed = await cypher.encrypt(PLAINTEXT, CONTEXT);
    const opened = await cypher.decrypt(sealed, CONTEXT);
    expect(opened).toEqual(PLAINTEXT);
  });

  it('the sealed payload holds no plaintext bytes', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    const sealed = await cypher.encrypt(PLAINTEXT, CONTEXT);
    expect(sealed.ciphertext).not.toEqual(PLAINTEXT);
    expect(sealed.iv.length).toBe(12);
    expect(sealed.dekId).toBe('dek-in-memory');
  });

  it('two seals of one payload differ (random IV)', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    const first = await cypher.encrypt(PLAINTEXT, CONTEXT);
    const second = await cypher.encrypt(PLAINTEXT, CONTEXT);
    expect(first.iv).not.toEqual(second.iv);
    expect(first.ciphertext).not.toEqual(second.ciphertext);
  });

  it('rejects a tampered ciphertext', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    const sealed = await cypher.encrypt(PLAINTEXT, CONTEXT);
    sealed.ciphertext[0] ^= 0xff;
    await expect(cypher.decrypt(sealed, CONTEXT)).rejects.toThrow();
  });

  it('rejects a payload opened under a different block id (AAD)', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    const sealed = await cypher.encrypt(PLAINTEXT, CONTEXT);
    const moved: CypherContext = { ...CONTEXT, blockId: 'feed-1:alice:1' };
    await expect(cypher.decrypt(sealed, moved)).rejects.toThrow();
  });

  it('rejects a payload naming an unknown DEK generation', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    const sealed = await cypher.encrypt(PLAINTEXT, CONTEXT);
    await expect(cypher.decrypt({ ...sealed, dekId: 'dek-other' }, CONTEXT)).rejects.toThrow();
  });

  it('shouldEncrypt honours the configured predicate', async () => {
    const cypher = createWebCryptoCypher({
      keyProvider: await createInMemoryKeyProvider(),
      shouldEncrypt: (feed) => feed.feedNamespace === 'data',
    });
    expect(cypher.shouldEncrypt({ spaceId: 's', feedId: 'f', feedNamespace: 'data' })).toBe(true);
    expect(cypher.shouldEncrypt({ spaceId: 's', feedId: 'f', feedNamespace: 'trace' })).toBe(false);
  });

  it('seals every feed by default', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    expect(cypher.shouldEncrypt({ spaceId: 's', feedId: 'f', feedNamespace: 'trace' })).toBe(true);
  });
});
