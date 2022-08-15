//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Keyring, KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/protocols';

import { createCredential } from './credential-factory';
import { verifyCredential } from './verifier';

describe('verifier', () => {
  describe('no chain', () => {
    test('pass', async () => {
      const keyring = new Keyring();
      const { publicKey: issuer } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey
        },
        issuer,
        keyring,
        subject
      });

      expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
    });

    test('fail - invalid signature', async () => {
      const keyring = new Keyring();
      const { publicKey: issuer } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey
        },
        issuer,
        keyring,
        subject
      });

      // Tamper with the signature.
      credential.proof.value[0]++;

      expect(await verifyCredential(credential)).toMatchObject({ kind: 'fail' });
    });

    test('fail - invalid issuer', async () => {
      const keyring = new Keyring();
      const { publicKey: issuer } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey
        },
        issuer,
        keyring,
        subject
      });

      // Tamper with the credential.
      credential.issuer = partyKey;

      expect(await verifyCredential(credential)).toMatchObject({ kind: 'fail' });
    });

    test('fail - invalid nonce', async () => {
      const keyring = new Keyring();
      const { publicKey: issuer } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey
        },
        issuer,
        keyring,
        subject,
        nonce: PublicKey.random().asUint8Array()
      });

      // Remove the nonce.
      credential.proof.nonce = undefined;

      expect(await verifyCredential(credential)).toMatchObject({ kind: 'fail' });
    });

    test('fail - no nonce provided', async () => {
      const keyring = new Keyring();
      const { publicKey: issuer } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey
        },
        issuer,
        keyring,
        subject
      });

      // Tamper with the credential.
      credential.proof.nonce = PublicKey.random().asUint8Array();

      expect(await verifyCredential(credential)).toMatchObject({ kind: 'fail' });
    });
  });
});
