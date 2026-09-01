//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type CypherContext } from './cypher.ts';
import { createInMemoryKeyProvider, createWebCryptoCypher } from './web-crypto-cypher.ts';

const CONTEXT: CypherContext = {
  feed: { spaceId: 'space-1', feedId: 'feed-1', feedNamespace: 'data' },
  blockId: 'feed-1:alice:0',
};

const PLAINTEXT = new Uint8Array([1, 2, 3, 4, 5]);

describe('WebCryptoCypher', () => {
  test('round-trips a payload', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    const sealed = await cypher.encrypt(PLAINTEXT, CONTEXT);
    const opened = await cypher.decrypt(sealed, CONTEXT);
    expect(opened).toEqual(PLAINTEXT);
  });

  test('the sealed payload holds no plaintext bytes', async () => {
    const keyProvider = await createInMemoryKeyProvider();
    const cypher = createWebCryptoCypher({ keyProvider });
    const sealed = await cypher.encrypt(PLAINTEXT, CONTEXT);
    expect(sealed.ciphertext).not.toEqual(PLAINTEXT);
    expect(sealed.iv.length).toBe(12);
    expect(sealed.encryptionKeyId).toBe(await keyProvider.currentKeyId());
  });

  test('the default key id is a public key', async () => {
    const keyProvider = await createInMemoryKeyProvider();
    expect(await keyProvider.currentKeyId()).toMatch(/^[0-9a-f]{64}$/);
  });

  test('two seals of one payload differ (random IV)', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    const first = await cypher.encrypt(PLAINTEXT, CONTEXT);
    const second = await cypher.encrypt(PLAINTEXT, CONTEXT);
    expect(first.iv).not.toEqual(second.iv);
    expect(first.ciphertext).not.toEqual(second.ciphertext);
  });

  test('rejects a tampered ciphertext', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    const sealed = await cypher.encrypt(PLAINTEXT, CONTEXT);
    sealed.ciphertext[0] ^= 0xff;
    await expect(cypher.decrypt(sealed, CONTEXT)).rejects.toThrow();
  });

  test('rejects a payload opened under a different block id (AAD)', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    const sealed = await cypher.encrypt(PLAINTEXT, CONTEXT);
    const moved: CypherContext = { ...CONTEXT, blockId: 'feed-1:alice:1' };
    await expect(cypher.decrypt(sealed, moved)).rejects.toThrow();
  });

  test('rejects a payload naming an unknown encryption key', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    const sealed = await cypher.encrypt(PLAINTEXT, CONTEXT);
    await expect(cypher.decrypt({ ...sealed, encryptionKeyId: 'other-key' }, CONTEXT)).rejects.toThrow();
  });

  test('shouldEncrypt honours the configured predicate', async () => {
    const cypher = createWebCryptoCypher({
      keyProvider: await createInMemoryKeyProvider(),
      shouldEncrypt: (feed) => feed.feedNamespace === 'data',
    });
    expect(cypher.shouldEncrypt({ spaceId: 's', feedId: 'f', feedNamespace: 'data' })).toBe(true);
    expect(cypher.shouldEncrypt({ spaceId: 's', feedId: 'f', feedNamespace: 'trace' })).toBe(false);
  });

  test('seals every feed by default', async () => {
    const cypher = createWebCryptoCypher({ keyProvider: await createInMemoryKeyProvider() });
    expect(cypher.shouldEncrypt({ spaceId: 's', feedId: 'f', feedNamespace: 'trace' })).toBe(true);
  });
});
