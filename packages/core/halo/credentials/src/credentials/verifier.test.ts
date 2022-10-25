//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import {
  Chain,
  PartyMember
} from '@dxos/protocols/proto/dxos/halo/credentials';

import { createCredential } from './credential-factory';
import { verifyCredential } from './verifier';

describe('verifier', function () {
  describe('no chain', function () {
    it('pass', async function () {
      const keyring = new Keyring();
      const issuer = await keyring.createKey();
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer,
        signer: keyring,
        subject
      });

      expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
    });

    it('fail - invalid signature', async function () {
      const keyring = new Keyring();
      const issuer = await keyring.createKey();
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer,
        signer: keyring,
        subject
      });

      // Tamper with the signature.
      credential.proof.value[0]++;

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail'
      });
    });

    it('fail - invalid issuer', async function () {
      const keyring = new Keyring();
      const issuer = await keyring.createKey();
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer,
        signer: keyring,
        subject
      });

      // Tamper with the credential.
      credential.issuer = partyKey;

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail'
      });
    });

    it('fail - invalid nonce', async function () {
      const keyring = new Keyring();
      const issuer = await keyring.createKey();
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer,
        signer: keyring,
        subject,
        nonce: PublicKey.random().asUint8Array()
      });

      // Remove the nonce.
      credential.proof.nonce = undefined;

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail'
      });
    });

    it('fail - no nonce provided', async function () {
      const keyring = new Keyring();
      const issuer = await keyring.createKey();
      const partyKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer,
        signer: keyring,
        subject
      });

      // Tamper with the credential.
      credential.proof.nonce = PublicKey.random().asUint8Array();

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail'
      });
    });
  });

  describe('chain', function () {
    it('pass - delegated authority with 1 device', async function () {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device = await keyring.createKey();
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
          signer: keyring
        })
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain
      });

      expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
    });

    it('fail - missing chain', async function () {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device = await keyring.createKey();
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
          signer: keyring
        })
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain
      });

      credential.proof.chain = undefined;

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail'
      });
    });

    it('fail - invalid chain signature', async function () {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device = await keyring.createKey();
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
          signer: keyring
        })
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain
      });

      credential.proof.chain!.credential.proof.value![0] = 123;

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail'
      });
    });

    it('fail - invalid chain assertion', async function () {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device = await keyring.createKey();
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
          signer: keyring
        })
      };
      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        signer: keyring,
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
        signer: keyring,
        subject
      });

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail'
      });
    });

    it('fail - chain does not lead to issuer', async function () {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const identity2 = await keyring.createKey();
      const device = await keyring.createKey();
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
          signer: keyring
        })
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
          role: PartyMember.Role.ADMIN
        },
        issuer: identity,
        signer: keyring,
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
        signer: keyring
      });

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail'
      });
    });

    it('pass - delegated authority with 2 devices', async function () {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device1 = await keyring.createKey();
      const device2 = await keyring.createKey();
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
          signer: keyring,
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
              signer: keyring
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
        signer: keyring,
        subject,
        signingKey: device2,
        chain
      });

      expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
    });

    it('fail - cyclic chain', async function () {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device1 = await keyring.createKey();
      const device2 = await keyring.createKey();
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
          signer: keyring,
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
              signer: keyring
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
        signer: keyring,
        subject,
        signingKey: device2,
        chain
      });

      credential.proof.chain!.credential.proof.chain!.credential =
        await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device1,
            identityKey: identity
          },
          subject: device1,
          issuer: device2,
          signer: keyring
        });

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail'
      });
    });
  });
});
