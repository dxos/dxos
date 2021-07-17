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

  expect(createKeyPair(keySeed)).resolves.toEqual(keyPair);

  expect(keyToString('not-a-cryptokey' as any)).rejects.toThrowError();
  expect(() => keyToBuffer('not-a-value-hex-key')).toThrowError();
  expect(() => keyToBuffer(keyPair.publicKey as any)).toThrowError();
});

test('Hashing', async () => {
  const keyPairA = await createKeyPair();
  const keyPairB = await createKeyPair();

  expect(createId()).not.toEqual(createId());

  const humanizedPublicKeyA = await humanize(keyPairA.publicKey);
  const humanizedPublicKeyB = await humanize(keyPairB.publicKey);

  expect(humanizedPublicKeyA).not.toEqual(humanizedPublicKeyB);
  expect(humanizedPublicKeyA).toEqual(hasher.humanize(await keyToString(keyPairA.publicKey)));
  expect(hasher.humanize(createId())).toBeDefined();
});

test('Signing', async () => {
  const { publicKey, privateKey } = await createKeyPair();
  const message = Buffer.from('hello world');
  const signature = await sign(message, privateKey);

  expect(signature.byteLength).toBe(SIGNATURE_LENGTH);
  expect(verify(message, signature, publicKey)).resolves.toBe(true);
  expect(verify(message, Buffer.alloc(64), publicKey)).resolves.toBe(false);
});
