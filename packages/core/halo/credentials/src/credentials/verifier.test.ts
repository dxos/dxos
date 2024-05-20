//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { randomBytes } from '@dxos/crypto';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { type Chain, SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { describe, test } from '@dxos/test';

import { createCredential } from './credential-factory';
import { verifyCredential } from './verifier';

describe('verifier', () => {
  describe('no chain', () => {
    test('pass', async () => {
      const keyring = new Keyring();
      const issuer = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer,
        signer: keyring,
        subject,
      });

      expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
    });

    test('fail - invalid signature', async () => {
      const keyring = new Keyring();
      const issuer = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer,
        signer: keyring,
        subject,
      });

      // Tamper with the signature.
      credential.proof!.value[0]++;

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail',
      });
    });

    test('fail - invalid issuer', async () => {
      const keyring = new Keyring();
      const issuer = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer,
        signer: keyring,
        subject,
      });

      // Tamper with the credential.
      credential.issuer = spaceKey;

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail',
      });
    });

    test('fail - invalid nonce', async () => {
      const keyring = new Keyring();
      const issuer = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer,
        signer: keyring,
        subject,
        nonce: PublicKey.random().asUint8Array(),
      });

      // Remove the nonce.
      credential.proof!.nonce = undefined;

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail',
      });
    });

    test('fail - no nonce provided', async () => {
      const keyring = new Keyring();
      const issuer = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer,
        signer: keyring,
        subject,
      });

      // Tamper with the credential.
      credential.proof!.nonce = PublicKey.random().asUint8Array();

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail',
      });
    });
  });

  test('parent references are part of the proof', async () => {
    const keyring = new Keyring();
    const issuer = await keyring.createKey();
    const credential = await createCredential({
      parentCredentialIds: [PublicKey.random()],
      assertion: {
        '@type': 'dxos.halo.credentials.SpaceMember',
        spaceKey: PublicKey.random(),
        role: SpaceMember.Role.ADMIN,
        genesisFeedKey: PublicKey.random(),
      },
      issuer,
      signer: keyring,
      subject: PublicKey.random(),
    });
    expect(credential.parentCredentialIds?.length).toEqual(1);
    expect(await verifyCredential(credential)).toMatchObject({ kind: 'pass' });

    // Tamper with the credential.
    credential.parentCredentialIds?.push(PublicKey.random());
    expect(await verifyCredential(credential)).toMatchObject({
      kind: 'fail',
    });
  });

  describe('chain', () => {
    test('pass - delegated authority with 1 device', async () => {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity,
          },
          subject: device,
          issuer: identity,
          signer: keyring,
        }),
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain,
      });

      expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
    });

    test('fail - missing chain', async () => {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity,
          },
          subject: device,
          issuer: identity,
          signer: keyring,
        }),
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain,
      });

      credential.proof!.chain = undefined;

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail',
      });
    });

    // TODO(burdon): Flaky.
    test.skip('fail - invalid chain signature', async () => {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity,
          },
          subject: device,
          issuer: identity,
          signer: keyring,
        }),
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain,
      });

      credential.proof!.chain!.credential.proof!.value = randomBytes(
        credential.proof!.chain!.credential.proof!.value.length,
      );

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail',
      });
    });

    test('fail - invalid chain assertion', async () => {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity,
          },
          subject: device,
          issuer: identity,
          signer: keyring,
        }),
      };
      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain,
      });

      credential.proof!.chain!.credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer: identity,
        signer: keyring,
        subject,
      });

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail',
      });
    });

    test('fail - chain does not lead to issuer', async () => {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const identity2 = await keyring.createKey();
      const device = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();
      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity,
          },
          subject: device,
          issuer: identity,
          signer: keyring,
        }),
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain,
      });

      credential.proof!.chain!.credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.AuthorizedDevice',
          deviceKey: device,
          identityKey: identity2,
        },
        subject: device,
        issuer: identity2,
        signer: keyring,
      });

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail',
      });
    });

    test('pass - delegated authority with 2 devices', async () => {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device1 = await keyring.createKey();
      const device2 = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device2,
            identityKey: identity,
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
                identityKey: identity,
              },
              subject: device1,
              issuer: identity,
              signer: keyring,
            }),
          },
        }),
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device2,
        chain,
      });

      expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
    });

    test('fail - cyclic chain', async () => {
      const keyring = new Keyring();
      const identity = await keyring.createKey();
      const device1 = await keyring.createKey();
      const device2 = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const chain: Chain = {
        credential: await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device2,
            identityKey: identity,
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
                identityKey: identity,
              },
              subject: device1,
              issuer: identity,
              signer: keyring,
            }),
          },
        }),
      };

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.SpaceMember',
          spaceKey,
          role: SpaceMember.Role.ADMIN,
          genesisFeedKey: PublicKey.random(),
        },
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device2,
        chain,
      });

      credential.proof!.chain!.credential.proof!.chain!.credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.AuthorizedDevice',
          deviceKey: device1,
          identityKey: identity,
        },
        subject: device1,
        issuer: device2,
        signer: keyring,
      });

      expect(await verifyCredential(credential)).toMatchObject({
        kind: 'fail',
      });
    });
  });
});
