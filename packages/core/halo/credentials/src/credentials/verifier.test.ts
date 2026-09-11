//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, test } from 'vitest';

import { randomBytes } from '@dxos/crypto';
import { Keyring } from '@dxos/keyring';
import { PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import {
  AuthorizedDeviceSchema,
  ChainSchema,
  SpaceMember_Role,
  SpaceMemberSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { createCredential } from './credential-factory.ts';
import { chainCredentialOf, chainOf, proofOf } from './credential-keys.ts';
import { verifyCredential } from './verifier.ts';

describe('verifier', () => {
  describe('no chain', () => {
    test('pass', async () => {
      const keyring = new Keyring();
      const issuer = await keyring.createKey();
      const spaceKey = PublicKey.random();
      const subject = PublicKey.random();

      const credential = await createCredential({
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
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
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
        issuer,
        signer: keyring,
        subject,
      });

      // Tamper with the signature.
      proofOf(credential).value[0]++;

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
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
        issuer,
        signer: keyring,
        subject,
      });

      // Tamper with the credential.
      credential.issuer = fromPublicKey(spaceKey);

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
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
        issuer,
        signer: keyring,
        subject,
        nonce: PublicKey.random().asUint8Array(),
      });

      // Remove the nonce.
      proofOf(credential).nonce = undefined;

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
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
        issuer,
        signer: keyring,
        subject,
      });

      // Tamper with the credential.
      proofOf(credential).nonce = PublicKey.random().asUint8Array();

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
      assertion: create(SpaceMemberSchema, {
        spaceKey: fromPublicKey(PublicKey.random()),
        role: SpaceMember_Role.ADMIN,
        genesisFeedKey: fromPublicKey(PublicKey.random()),
      }),
      issuer,
      signer: keyring,
      subject: PublicKey.random(),
    });
    expect(credential.parentCredentialIds.length).toEqual(1);
    expect(await verifyCredential(credential)).toMatchObject({ kind: 'pass' });

    // Tamper with the credential.
    credential.parentCredentialIds.push(fromPublicKey(PublicKey.random()));
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

      const chain = create(ChainSchema, {
        credential: await createCredential({
          assertion: create(AuthorizedDeviceSchema, {
            identityKey: fromPublicKey(identity),
            deviceKey: fromPublicKey(device),
          }),
          subject: device,
          issuer: identity,
          signer: keyring,
        }),
      });

      const credential = await createCredential({
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
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

      const chain = create(ChainSchema, {
        credential: await createCredential({
          assertion: create(AuthorizedDeviceSchema, {
            identityKey: fromPublicKey(identity),
            deviceKey: fromPublicKey(device),
          }),
          subject: device,
          issuer: identity,
          signer: keyring,
        }),
      });

      const credential = await createCredential({
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain,
      });

      proofOf(credential).chain = undefined;

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

      const chain = create(ChainSchema, {
        credential: await createCredential({
          assertion: create(AuthorizedDeviceSchema, {
            identityKey: fromPublicKey(identity),
            deviceKey: fromPublicKey(device),
          }),
          subject: device,
          issuer: identity,
          signer: keyring,
        }),
      });

      const credential = await createCredential({
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain,
      });

      proofOf(chainCredentialOf(credential)).value = randomBytes(proofOf(chainCredentialOf(credential)).value.length);

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

      const chain = create(ChainSchema, {
        credential: await createCredential({
          assertion: create(AuthorizedDeviceSchema, {
            identityKey: fromPublicKey(identity),
            deviceKey: fromPublicKey(device),
          }),
          subject: device,
          issuer: identity,
          signer: keyring,
        }),
      });
      const credential = await createCredential({
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain,
      });

      chainOf(credential).credential = await createCredential({
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
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
      const chain = create(ChainSchema, {
        credential: await createCredential({
          assertion: create(AuthorizedDeviceSchema, {
            identityKey: fromPublicKey(identity),
            deviceKey: fromPublicKey(device),
          }),
          subject: device,
          issuer: identity,
          signer: keyring,
        }),
      });

      const credential = await createCredential({
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device,
        chain,
      });

      chainOf(credential).credential = await createCredential({
        assertion: create(AuthorizedDeviceSchema, {
          identityKey: fromPublicKey(identity2),
          deviceKey: fromPublicKey(device),
        }),
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

      const chain = create(ChainSchema, {
        credential: await createCredential({
          assertion: create(AuthorizedDeviceSchema, {
            identityKey: fromPublicKey(identity),
            deviceKey: fromPublicKey(device2),
          }),
          subject: device2,
          issuer: identity,
          signer: keyring,
          signingKey: device1,
          chain: create(ChainSchema, {
            credential: await createCredential({
              assertion: create(AuthorizedDeviceSchema, {
                identityKey: fromPublicKey(identity),
                deviceKey: fromPublicKey(device1),
              }),
              subject: device1,
              issuer: identity,
              signer: keyring,
            }),
          }),
        }),
      });

      const credential = await createCredential({
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
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

      const chain = create(ChainSchema, {
        credential: await createCredential({
          assertion: create(AuthorizedDeviceSchema, {
            identityKey: fromPublicKey(identity),
            deviceKey: fromPublicKey(device2),
          }),
          subject: device2,
          issuer: identity,
          signer: keyring,
          signingKey: device1,
          chain: create(ChainSchema, {
            credential: await createCredential({
              assertion: create(AuthorizedDeviceSchema, {
                identityKey: fromPublicKey(identity),
                deviceKey: fromPublicKey(device1),
              }),
              subject: device1,
              issuer: identity,
              signer: keyring,
            }),
          }),
        }),
      });

      const credential = await createCredential({
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(spaceKey),
          role: SpaceMember_Role.ADMIN,
          genesisFeedKey: fromPublicKey(PublicKey.random()),
        }),
        issuer: identity,
        signer: keyring,
        subject,
        signingKey: device2,
        chain,
      });

      chainOf(chainCredentialOf(credential)).credential = await createCredential({
        assertion: create(AuthorizedDeviceSchema, {
          identityKey: fromPublicKey(identity),
          deviceKey: fromPublicKey(device1),
        }),
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
