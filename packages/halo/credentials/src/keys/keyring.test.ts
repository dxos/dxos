//
// Copyright 2019 DXOS.org
//

// dxos-testing-browser

import assert from 'assert';

import { createKeyPair, keyToString, randomBytes, verify, PublicKey } from '@dxos/crypto';
import { expectToThrow } from '@dxos/debug';

import { KeyType, schema } from '../proto';
import { Filter } from './filter';
import { Keyring } from './keyring';

test('Generate keys', async () => {
  const keyring = new Keyring();

  const byType = new Map();
  for await (const type of Object.values(KeyType)) {
    if (typeof type === 'string') {
      const keyRecord = await keyring.createKeyRecord({ type: KeyType[type as any] });
      byType.set(type, keyRecord);
    }
  }

  for (const type of Object.values(KeyType)) {
    if (typeof type === 'string') {
      const match = keyring.findKey(Filter.matches({ type: KeyType[type as any] }));
      expect(match!.publicKey).toEqual(byType.get(type).publicKey);
      expect(keyring.hasSecretKey(match!)).toBe(true);
    }
  }
});

test('Update a key', async () => {
  const keyring = new Keyring();
  const record = await keyring.createKeyRecord({ type: KeyType.DEVICE });

  {
    const stored = keyring.getKey(record.publicKey);
    expect(keyring.hasSecretKey(stored!)).toBe(true);
    expect(stored!.trusted).toBe(true);
  }

  const { ...copy } = record;
  copy.trusted = false;

  await keyring.updateKey(copy);

  {
    const stored = keyring.getKey(record.publicKey);
    expect(keyring.hasSecretKey(stored!)).toBe(true);
    expect(stored!.trusted).toBe(false);
  }
});

test('Bad key attributes', async () => {
  const keyring = new Keyring();
  await expect(() => keyring.createKeyRecord({ id: 'xxx' })).rejects.toThrow();
});

test('Add/retrieve single keyRecord from an external source', async () => {
  const external = createKeyPair();
  const keyring = new Keyring();
  await keyring.addKeyRecord(external as any);

  const internal = keyring.getKey(external.publicKey);
  expect(internal!.publicKey).toEqual(PublicKey.from(external.publicKey));
  expect(keyring.hasSecretKey(internal!)).toBe(true);
});

test('Try to add/retrieve a publicKey from an external source (with secret present)', async () => {
  const external = createKeyPair();
  const keyring = new Keyring();

  await expect(() => keyring.addPublicKey(external as any)).rejects.toThrow();
});

test('Add/retrieve a publicKey from an external source (without secret present)', async () => {
  const external = { publicKey: createKeyPair().publicKey };
  const keyring = new Keyring();
  await keyring.addPublicKey(external as any);

  const stored = keyring.getKey(external.publicKey);
  expect(PublicKey.from(external.publicKey)).toEqual(stored!.publicKey);
  expect(keyring.hasSecretKey(stored!)).toBe(false);
});

test('Retrieve a non-existent key', async () => {
  const keyring = new Keyring();
  const internal = keyring.findKey(Filter.matches({ key: keyToString(randomBytes(32)) }));
  expect(internal).toBeUndefined();
});

test('Sign and verify a message with a single key', async () => {
  const keyring = new Keyring();
  const original = await keyring.createKeyRecord({ type: KeyType.IDENTITY });

  const signed = keyring.sign({ message: 'Test' }, [
    keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))!
  ]);
  expect(signed!.signatures!.length).toBe(1);
  expect(PublicKey.from(signed!.signatures![0].key)).toEqual(original.publicKey);

  const verified = keyring.verify(signed);
  expect(verified).toBe(true);
});

test('Sign and verify a message with multiple keys', async () => {
  const keyring = new Keyring();
  await keyring.createKeyRecord({ type: KeyType.IDENTITY });
  await keyring.createKeyRecord({ type: KeyType.DEVICE });

  const keys = [
    keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY })),
    keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }))
  ];

  const signed = keyring.sign({ message: 'Test' }, keys as any);
  expect(signed!.signatures!.length).toEqual(keys.length);

  const strKeys = keys.map(key => key!.publicKey.toHex());
  for (const sig of signed!.signatures!) {
    expect(strKeys).toContain(sig.key.toHex());
  }

  const verified = keyring.verify(signed);
  expect(verified).toBe(true);
});

test('Sign and verify a message using a key chain', async () => {
  const keyringA = new Keyring();
  const identityA = await keyringA.createKeyRecord({ type: KeyType.IDENTITY });
  const deviceAA = await keyringA.createKeyRecord({ type: KeyType.DEVICE });
  const deviceAB = await keyringA.createKeyRecord({ type: KeyType.DEVICE });

  // Trust IdentityA, but not DeviceA.
  const keyringB = new Keyring();
  await keyringB.addPublicKey(identityA);

  const keyMessages = new Map();
  keyMessages.set(identityA.publicKey.toHex(), keyringA.sign({ message: 'Test' }, [identityA]));
  keyMessages.set(deviceAA.publicKey.toHex(), keyringA.sign({ message: 'Test' }, [identityA, deviceAA]));
  keyMessages.set(deviceAB.publicKey.toHex(), keyringA.sign({ message: 'Test' }, [deviceAB, deviceAA]));

  const deviceABChain = Keyring.buildKeyChain(deviceAB.publicKey, keyMessages);

  const signed = keyringA.sign({ message: 'Test' }, [deviceABChain]);
  expect(signed!.signatures!.length).toBe(1);
  expect(PublicKey.from(signed!.signatures![0].key).toHex()).toEqual(deviceAB.publicKey.toHex());
  expect(signed!.signatures![0].keyChain).toBeTruthy();

  {
    const verified = keyringA.verify(signed);
    expect(verified).toBe(true);
  }
  {
    const verified = keyringB.verify(signed);
    expect(verified).toBe(true);
  }
  {
    const verified = keyringB.verify(signed, { allowKeyChains: false });
    expect(verified).toBe(false);
  }
});

test('Attempt to sign a message with a publicKey', async () => {
  const keyring = new Keyring();
  const original = await keyring.createKeyRecord({ type: KeyType.PARTY });

  // This should work.
  {
    const stored = keyring.getKey(original.publicKey);
    const signed = keyring.sign({ message: 'Test' }, [stored!]);
    expect(signed!.signatures!.length).toBe(1);
    expect(keyring.verify(signed)).toBe(true);
  }

  // Erase the secretKey.
  {
    await keyring.deleteSecretKey(original);
    const stored = keyring.getKey(original.publicKey);
    expect(stored).toBeTruthy();
    expect(keyring.hasSecretKey(stored!)).toBe(false);
    expect(() => {
      keyring.sign({ message: 'Test' }, [stored!]);
    }).toThrow(assert.AssertionError);
  }
});

test('Attempt to add a badly formatted key', async () => {
  const keyring = new Keyring();
  const good = createKeyPair();
  const bad = {
    publicKey: keyToString(good.publicKey),
    secretKey: keyToString(good.secretKey)
  };

  await expectToThrow(() => keyring.addKeyRecord(bad as any), assert.AssertionError as any);
});

test('Attempt to add a keyRecord missing its secretKey', async () => {
  const keyring = new Keyring();
  const good = createKeyPair();
  const bad = {
    publicKey: good.publicKey
  };

  await expectToThrow(() => keyring.addKeyRecord(bad as any), assert.AssertionError as any);
});

test('Attempt to add a keyRecord missing its publicKey', async () => {
  const keyring = new Keyring();
  const good = createKeyPair();
  const bad = {
    secretKey: good.secretKey
  };

  await expectToThrow(() => keyring.addKeyRecord(bad as any), assert.AssertionError as any);
});

test('Attempt to add keyRecord with reversed publicKey/secretKey', async () => {
  const keyring = new Keyring();
  const good = createKeyPair();
  const bad = {
    secretKey: good.publicKey,
    publicKey: good.secretKey
  };

  await expectToThrow(() => keyring.addKeyRecord(bad as any), assert.AssertionError as any);
});

test('Attempt to add secretKey as a publicKey', async () => {
  const { secretKey } = createKeyPair();
  const keyring = new Keyring();
  const bad = {
    publicKey: secretKey
  };

  await expectToThrow(() => keyring.addPublicKey(bad as any), assert.AssertionError as any);
});

test('Tamper with the contents of a signed message', async () => {
  const keyring = new Keyring();
  const message = { a: 'A', b: 'B', c: 'C' };

  await keyring.createKeyRecord({ type: KeyType.IDENTITY });
  await keyring.createKeyRecord({ type: KeyType.DEVICE });

  const signedCopy = keyring.sign(message, [
    keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))!,
    keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }))!
  ]);

  expect(keyring.verify(signedCopy)).toBe(true);

  (signedCopy.signed as any).C = 'D';
  expect(keyring.verify(signedCopy)).toBe(false);
});

test('Tamper with the signature of a signed message', async () => {
  const keyring = new Keyring();
  const message = { a: 'A', b: 'B', c: 'C' };

  await keyring.createKeyRecord({ type: KeyType.IDENTITY });
  await keyring.createKeyRecord({ type: KeyType.DEVICE });

  const signedCopy = keyring.sign(message, [
    keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))!,
    keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }))!
  ]);

  expect(keyring.verify(signedCopy)).toBe(true);

  signedCopy!.signatures![1].signature = randomBytes(64);
  expect(keyring.verify(signedCopy)).toBe(false);
});

test('Tamper with the signature key of a signed message', async () => {
  const keyring = new Keyring();
  await keyring.createKeyRecord({ type: KeyType.IDENTITY });
  await keyring.createKeyRecord({ type: KeyType.DEVICE });

  const message = { a: 'A', b: 'B', c: 'C' };
  const signedCopy = keyring.sign(message, [
    keyring.findKey(Keyring.signingFilter({ type: KeyType.IDENTITY }))!,
    keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }))!
  ]);
  expect(keyring.verify(signedCopy)).toBe(true);

  signedCopy!.signatures![1].key = randomBytes(32) as any;
  expect(keyring.verify(signedCopy)).toBe(false);
});

test('To/from JSON', async () => {
  const original = new Keyring();
  for (const type of Object.values(KeyType)) {
    if (typeof type === 'string') {
      await original.createKeyRecord({ type: KeyType[type as any] });
    }
  }

  const copy = new Keyring();
  await copy.loadJSON(original.toJSON());

  expect(original.toJSON()).toEqual(copy.toJSON());
  expect(copy.keys).toEqual(original.keys);
});

test('Raw sign', async () => {
  const keyring = new Keyring();
  const key = await keyring.createKeyRecord({ type: KeyType.IDENTITY });

  const message = randomBytes();
  const signature = keyring.rawSign(message, key);

  expect(verify(message, signature, key.publicKey.asBuffer())).toBe(true);
});

test('To/from Protobuf', async () => {
  const original = new Keyring();
  for (const type of Object.values(KeyType)) {
    if (typeof type === 'string') {
      await original.createKeyRecord({ type: KeyType[type as any] });
    }
  }

  const copy = new Keyring();
  const codec = schema.getCodecForType('dxos.credentials.keys.KeyRecordList');
  const bytes = codec.encode(original.export());
  const decoded = codec.decode(bytes);
  await copy.import(decoded);

  expect(original.toJSON()).toEqual(copy.toJSON());
  expect(copy.keys).toEqual(original.keys);
});

test('Authenticate flow for Kube/Keyhole authentication', async () => {
  const kubeKeyring = new Keyring();
  const kubeIdentity = await kubeKeyring.createKeyRecord({ type: KeyType.IDENTITY });

  const userKeyring = new Keyring();
  const userIdentity = await userKeyring.createKeyRecord({ type: KeyType.IDENTITY });
  const userDevice = await userKeyring.createKeyRecord({ type: KeyType.DEVICE });

  // Admit user device key with a signature from identity key. This is done when inviting user device to HALO. 
  const deviceAdmit = userKeyring.sign({ message: 'Test' }, [userIdentity, userDevice])

  // KUBE give user a signed credential and trust his identity.
  const kubeCredential = kubeKeyring.sign({ admit: userIdentity.publicKey.toHex() }, [kubeIdentity])
  kubeKeyring.addPublicKey(userIdentity)

  // User's device builds a keychain

  const keyMessages = new Map();
  keyMessages.set(userDevice.publicKey.toHex(), deviceAdmit);
  keyMessages.set(userIdentity.publicKey.toHex(), deviceAdmit);

  const keychain = Keyring.buildKeyChain(userDevice.publicKey, keyMessages);
  
  // User's device signes the credential using a keychain with a challenge token given by KUBE
  const signedCrendetial = userKeyring.sign(kubeCredential, [keychain], Buffer.from('challenge token'))

  // KUBE verifies user's credential
  // expect(signed.signatures.length).toBe(1);
  // expect(signed.signatures[0].key.toHex()).toEqual(userDevice.publicKey.toHex());
  // expect(signed.signatures[0].keyChain).toBeTruthy();
  // expect(signed.signed.nonce).toBe('challenge token');
  expect(kubeKeyring.verify(signedCrendetial)).toBe(true)
});
