//
// Copyright 2020 DXOS.org
//

// dxos-testing-browser

import {
  createKeyPair,
  createId,
  hasher,
  humanize,
  keyToBuffer,
  keyToJson,
  keyToString,
  sign,
  verify,
  SIGNATURE_LENGTH
} from './keys';

test('Basic key operations', async () => {
  const keyPair = await createKeyPair();

  const keySeed = {
    publicKey: keyToBuffer(await keyToString(keyPair.publicKey)),
    privateKey: await keyToJson(keyPair.privateKey)
  };

  expect(await createKeyPair(keySeed)).toEqual(keyPair);

  // expect(() => keyToString('not-a-cryptokey' as any)).toThrowError();
  // expect(() => keyToBuffer('not-a-value-hex-key')).toThrowError();
  expect(() => keyToBuffer(keyPair.publicKey as any)).toThrowError();
});

test('Hashing', async () => {
  const keyPairA = await createKeyPair();
  const keyPairB = await createKeyPair();
  const { publicKey } = keyPairA;

  expect(createId()).not.toEqual(createId());

  expect(await humanize(publicKey)).not.toEqual(await humanize(keyPairB.publicKey));
  expect(await humanize(publicKey)).toEqual(hasher.humanize(await keyToString(publicKey)));
  expect(hasher.humanize(createId())).toBeDefined();
});

test('Signing', async () => {
  const { publicKey, privateKey } = await createKeyPair();
  const message = Buffer.from('hello world');
  const signature = await sign(message, privateKey);

  expect(signature.byteLength).toBe(SIGNATURE_LENGTH);
  expect(await verify(message, signature, publicKey)).toBe(true);
  expect(await verify(message, Buffer.alloc(64), publicKey)).toBe(false);
});
