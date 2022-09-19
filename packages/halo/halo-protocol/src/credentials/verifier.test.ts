//
// Copyright 2022 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { Keyring } from '@dxos/credentials';
import { PublicKey } from '@dxos/protocols';
import { Chain, PartyMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { KeyType } from '@dxos/protocols/proto/dxos/halo/keys';

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
          partyKey,
          role: PartyMember.Role.ADMIN
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
          partyKey,
          role: PartyMember.Role.ADMIN
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
          partyKey,
          role: PartyMember.Role.ADMIN
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
          partyKey,
          role: PartyMember.Role.ADMIN
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
          partyKey,
          role: PartyMember.Role.ADMIN
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

  describe('chain', () => {
    test('pass - delegated authority with 1 device', async () => {
      const keyring = new Keyring();
      const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const { publicKey: device } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity
          },
          subject: device,
          issuer: identity,
          keyring
        })
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        keyring,
        subject,
        signingKey: device,
        chain
      });

      expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
    });

    test('fail - missing chain', async () => {
      const keyring = new Keyring();
      const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const { publicKey: device } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity
          },
          subject: device,
          issuer: identity,
          keyring
        })
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        keyring,
        subject,
        signingKey: device,
        chain
      });

      credential.proof.chain = undefined;

      expect(await verifyCredential(credential)).toMatchObject({ kind: 'fail' });
    });

    test('fail - invalid chain signature', async () => {
      const keyring = new Keyring();
      const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const { publicKey: device } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity
          },
          subject: device,
          issuer: identity,
          keyring
        })
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        keyring,
        subject,
        signingKey: device,
        chain
      });

      credential.proof.chain!.credential.proof.value![0] = 123;

      expect(await verifyCredential(credential)).toMatchObject({ kind: 'fail' });
    });

    test('fail - invalid chain assertion', async () => {
      const keyring = new Keyring();
      const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const { publicKey: device } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity
          },
          subject: device,
          issuer: identity,
          keyring
        })
      };
      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        keyring,
        subject,
        signingKey: device,
        chain
      });

      credential.proof.chain!.credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        keyring,
        subject
      });

      expect(await verifyCredential(credential)).toMatchObject({ kind: 'fail' });
    });

    test('fail - chain does not lead to issuer', async () => {
      const keyring = new Keyring();
      const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const { publicKey: identity2 } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const { publicKey: device } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();
      const chain: Chain = {

        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity
          },
          subject: device,
          issuer: identity,
          keyring
        })
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        keyring,
        subject,
        signingKey: device,
        chain
      });

      credential.proof.chain!.credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.AuthorizedDevice',
          deviceKey: device,
          identityKey: identity2
        },
        subject: device,
        issuer: identity2,
        keyring
      });

      expect(await verifyCredential(credential)).toMatchObject({ kind: 'fail' });
    });

    test('pass - delegated authority with 2 devices', async () => {
      const keyring = new Keyring();
      const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const { publicKey: device1 } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const { publicKey: device2 } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device2,
            identityKey: identity
          },
          subject: device2,
          issuer: identity,
          keyring,
          signingKey: device1,
          chain: {
            credential: await createCredential({
              assertion: {
                '@type': 'dxos.halo.credentials.AuthorizedDevice',
                deviceKey: device1,
                identityKey: identity
              },
              subject: device1,
              issuer: identity,
              keyring
            })
          }
        })
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        keyring,
        subject,
        signingKey: device2,
        chain
      });

      expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
    });

    test('fail - cyclic chain', async () => {
      const keyring = new Keyring();
      const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const { publicKey: device1 } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const { publicKey: device2 } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device2,
            identityKey: identity
          },
          subject: device2,
          issuer: identity,
          keyring,
          signingKey: device1,
          chain: {
            credential: await createCredential({
              assertion: {
                '@type': 'dxos.halo.credentials.AuthorizedDevice',
                deviceKey: device1,
                identityKey: identity
              },
              subject: device1,
              issuer: identity,
              keyring
            })
          }
        })
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        keyring,
        subject,
        signingKey: device2,
        chain
      });

      credential.proof.chain!.credential.proof.chain!.credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.AuthorizedDevice',
          deviceKey: device1,
          identityKey: identity
        },
        subject: device1,
        issuer: device2,
        keyring
      });

      expect(await verifyCredential(credential)).toMatchObject({ kind: 'fail' });
    });
  });
});
