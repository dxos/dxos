//
// Copyright 2022 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Keyring } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { create } from '@dxos/protocols/buf';
import {
  AdmittedFeed_Designation,
  AdmittedFeedSchema,
  AuthorizedDeviceSchema,
  ChainSchema,
  HaloSpaceSchema,
  SpaceGenesisSchema,
  SpaceMember_Role,
  SpaceMemberSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import {
  createCredential,
  fromBufPublicKey,
  getAssertionFromCredential,
  toBufPublicKey,
  verifyCredential,
} from '../credentials';

import { SpaceStateMachine } from './space-state-machine';

describe('SpaceStateMachine', () => {
  test('basic space creation', async () => {
    const keyring = new Keyring();
    const space = await keyring.createKey();
    const identity = await keyring.createKey();
    const device = await keyring.createKey();
    const feed = await keyring.createKey();

    const spaceState = new SpaceStateMachine(space);

    expect(
      await spaceState.process(
        await createCredential({
          issuer: space,
          subject: space,
          assertion: create(SpaceGenesisSchema, {
            spaceKey: toBufPublicKey(space),
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    expect(
      await spaceState.process(
        await createCredential({
          issuer: space,
          subject: identity,
          assertion: create(SpaceMemberSchema, {
            spaceKey: toBufPublicKey(space),
            role: SpaceMember_Role.ADMIN,
            genesisFeedKey: toBufPublicKey(feed),
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    const chain = create(ChainSchema, {
      credential: await createCredential({
        assertion: create(AuthorizedDeviceSchema, {
          deviceKey: toBufPublicKey(device),
          identityKey: toBufPublicKey(identity),
        }),
        subject: device,
        issuer: identity,
        signer: keyring,
      }),
    });

    expect(
      await spaceState.process(
        await createCredential({
          issuer: identity,
          subject: feed,
          assertion: create(AdmittedFeedSchema, {
            spaceKey: toBufPublicKey(space),
            identityKey: toBufPublicKey(identity),
            deviceKey: toBufPublicKey(device),
            designation: AdmittedFeed_Designation.CONTROL,
          }),
          signer: keyring,
          signingKey: device,
          chain,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    expect(spaceState.genesisCredential).toBeDefined();
    expect(Array.from(spaceState.members.values())).toMatchObject([
      {
        key: identity,
        assertion: {
          role: SpaceMember_Role.ADMIN,
        },
      },
    ]);
    expect(Array.from(spaceState.feeds.values())).toMatchObject([
      {
        key: feed,
        assertion: {
          designation: AdmittedFeed_Designation.CONTROL,
        },
      },
    ]);
    expect(spaceState.credentials).toHaveLength(3);
  });

  test('admitting a member', async () => {
    const keyring = new Keyring();
    const space = await keyring.createKey();
    const identity = await keyring.createKey();
    const device = await keyring.createKey();
    const feed = await keyring.createKey();
    const identity2 = await keyring.createKey();

    const spaceState = new SpaceStateMachine(space);

    // Create the space genesis credential.
    expect(
      await spaceState.process(
        await createCredential({
          issuer: space,
          subject: space,
          assertion: create(SpaceGenesisSchema, {
            spaceKey: toBufPublicKey(space),
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    // Create the space member credential.
    expect(
      await spaceState.process(
        await createCredential({
          issuer: space,
          subject: identity,
          assertion: create(SpaceMemberSchema, {
            spaceKey: toBufPublicKey(space),
            role: SpaceMember_Role.ADMIN,
            genesisFeedKey: toBufPublicKey(feed),
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    const chain = create(ChainSchema, {
      credential: await createCredential({
        assertion: create(AuthorizedDeviceSchema, {
          deviceKey: toBufPublicKey(device),
          identityKey: toBufPublicKey(identity),
        }),
        subject: device,
        issuer: identity,
        signer: keyring,
      }),
    });

    expect(
      await spaceState.process(
        await createCredential({
          issuer: identity,
          subject: identity2,
          assertion: create(SpaceMemberSchema, {
            spaceKey: toBufPublicKey(space),
            role: SpaceMember_Role.EDITOR,
            genesisFeedKey: toBufPublicKey(feed),
          }),
          signer: keyring,
          signingKey: device,
          chain,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    expect(spaceState.genesisCredential).toBeDefined();
    const comparator = (m1: { key: PublicKey }, m2: { key: PublicKey }) => m1.key.toHex().localeCompare(m2.key.toHex());
    expect(Array.from(spaceState.members.values()).sort(comparator)).toMatchObject(
      [
        {
          key: identity,
          assertion: {
            role: SpaceMember_Role.ADMIN,
          },
        },
        {
          key: identity2,
          assertion: {
            role: SpaceMember_Role.EDITOR,
          },
        },
      ].sort(comparator),
    );
    expect(Array.from(spaceState.feeds.values())).toMatchObject([]);
    expect(spaceState.credentials).toHaveLength(3);
  });

  test('storing device credentials and building a chain', async () => {
    const keyring = new Keyring();
    const haloSpace = await keyring.createKey();
    const identity = await keyring.createKey();
    const device1 = await keyring.createKey();
    const device2 = await keyring.createKey();
    const feed = await keyring.createKey();

    const haloState = new SpaceStateMachine(haloSpace);

    // Create the space genesis credential.
    expect(
      await haloState.process(
        await createCredential({
          issuer: haloSpace,
          subject: haloSpace,
          assertion: create(SpaceGenesisSchema, {
            spaceKey: toBufPublicKey(haloSpace),
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    // Admit the identity to the space.
    expect(
      await haloState.process(
        await createCredential({
          issuer: haloSpace,
          subject: identity,
          assertion: create(SpaceMemberSchema, {
            spaceKey: toBufPublicKey(haloSpace),
            role: SpaceMember_Role.ADMIN,
            genesisFeedKey: toBufPublicKey(feed),
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    // Assign the HALO space to the identity.
    expect(
      await haloState.process(
        await createCredential({
          issuer: identity,
          subject: identity,
          assertion: create(HaloSpaceSchema, {
            identityKey: toBufPublicKey(identity),
            haloKey: toBufPublicKey(haloSpace),
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    // Admit device1 to the identity.
    expect(
      await haloState.process(
        await createCredential({
          assertion: create(AuthorizedDeviceSchema, {
            deviceKey: toBufPublicKey(device1),
            identityKey: toBufPublicKey(identity),
          }),
          subject: device1,
          issuer: identity,
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    // Admit device2 to the identity (signed by device1).
    expect(
      await haloState.process(
        await createCredential({
          assertion: create(AuthorizedDeviceSchema, {
            deviceKey: toBufPublicKey(device2),
            identityKey: toBufPublicKey(identity),
          }),
          subject: device2,
          issuer: identity,
          signingKey: device1,
          // Create the keychain for device1 using credentials from the space.
          chain: create(ChainSchema, {
            credential: haloState.credentials.find(
              (c) =>
                getAssertionFromCredential(c).$typeName === 'dxos.halo.credentials.AuthorizedDevice' &&
                fromBufPublicKey(c.subject!.id!)?.equals(device1),
            )!,
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    // Issue a feed admit credential using the chain.
    const credential = await createCredential({
      assertion: create(AdmittedFeedSchema, {
        spaceKey: toBufPublicKey(haloSpace),
        deviceKey: toBufPublicKey(device2),
        designation: AdmittedFeed_Designation.CONTROL,
        identityKey: toBufPublicKey(identity),
      }),
      issuer: identity,
      signer: keyring,
      subject: feed,
      signingKey: device2,
      // Create the keychain for device2 using credentials from the space.
      chain: create(ChainSchema, {
        credential: haloState.credentials.find(
          (c) =>
            getAssertionFromCredential(c).$typeName === 'dxos.halo.credentials.AuthorizedDevice' &&
            fromBufPublicKey(c.subject!.id!)?.equals(device2),
        )!,
      }),
    });

    expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
  });
});
