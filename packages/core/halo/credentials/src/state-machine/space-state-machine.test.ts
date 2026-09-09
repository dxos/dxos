//
// Copyright 2022 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, test } from 'vitest';

import { invariant } from '@dxos/invariant';
import { Keyring } from '@dxos/keyring';
import { type PublicKey } from '@dxos/keys';
import { fromPublicKey } from '@dxos/protocols/buf';
import {
  AdmittedFeed_Designation,
  AdmittedFeedSchema,
  AuthorizedDeviceSchema,
  ChainSchema,
  type Credential,
  HaloSpaceSchema,
  MembershipPolicy,
  SpaceGenesisSchema,
  SpaceMember_Role,
  SpaceMemberSchema,
} from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { createCredential, getCredentialAssertion, subjectIdOf, verifyCredential } from '../credentials';
import { type SpaceState, SpaceStateMachine } from './space-state-machine';

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
            spaceKey: fromPublicKey(space),
            membershipPolicy: MembershipPolicy.INVITE,
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
            spaceKey: fromPublicKey(space),
            role: SpaceMember_Role.ADMIN,
            genesisFeedKey: fromPublicKey(feed),
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    const chain = create(ChainSchema, {
      credential: await createCredential({
        assertion: create(AuthorizedDeviceSchema, {
          deviceKey: fromPublicKey(device),
          identityKey: fromPublicKey(identity),
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
            spaceKey: fromPublicKey(space),
            identityKey: fromPublicKey(identity),
            deviceKey: fromPublicKey(device),
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
          spaceKey: fromPublicKey(space),
          role: SpaceMember_Role.ADMIN,
        },
      },
    ]);
    expect(Array.from(spaceState.feeds.values())).toMatchObject([
      {
        key: feed,
        assertion: {
          spaceKey: fromPublicKey(space),
          identityKey: fromPublicKey(identity),
          deviceKey: fromPublicKey(device),
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

    // Create the space genesis credential.`
    expect(
      await spaceState.process(
        await createCredential({
          issuer: space,
          subject: space,
          assertion: create(SpaceGenesisSchema, {
            spaceKey: fromPublicKey(space),
            membershipPolicy: MembershipPolicy.INVITE,
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    // // Create the space member credential.
    expect(
      await spaceState.process(
        await createCredential({
          issuer: space,
          subject: identity,
          assertion: create(SpaceMemberSchema, {
            spaceKey: fromPublicKey(space),
            role: SpaceMember_Role.ADMIN,
            genesisFeedKey: fromPublicKey(feed),
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    const chain = create(ChainSchema, {
      credential: await createCredential({
        assertion: create(AuthorizedDeviceSchema, {
          deviceKey: fromPublicKey(device),
          identityKey: fromPublicKey(identity),
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
            spaceKey: fromPublicKey(space),
            role: SpaceMember_Role.EDITOR,
            genesisFeedKey: fromPublicKey(feed),
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
            spaceKey: fromPublicKey(space),
            role: SpaceMember_Role.ADMIN,
          },
        },
        {
          key: identity2,
          assertion: {
            spaceKey: fromPublicKey(space),
            role: SpaceMember_Role.EDITOR,
          },
        },
      ].sort(comparator),
    );
    expect(Array.from(spaceState.feeds.values())).toMatchObject([]);
    expect(spaceState.credentials).toHaveLength(3);
  });

  test('space genesis with tags', async () => {
    const keyring = new Keyring();
    const space = await keyring.createKey();
    const identity = await keyring.createKey();
    const feed = await keyring.createKey();

    const spaceState = new SpaceStateMachine(space);

    expect(spaceState.tags).toEqual([]);

    expect(
      await spaceState.process(
        await createCredential({
          issuer: space,
          subject: space,
          assertion: create(SpaceGenesisSchema, {
            spaceKey: fromPublicKey(space),
            tags: ['personal', 'test'],
            membershipPolicy: MembershipPolicy.INVITE,
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    expect(spaceState.tags).toEqual(['personal', 'test']);
  });

  test('space genesis without tags returns empty array', async () => {
    const keyring = new Keyring();
    const space = await keyring.createKey();
    const feed = await keyring.createKey();

    const spaceState = new SpaceStateMachine(space);

    await spaceState.process(
      await createCredential({
        issuer: space,
        subject: space,
        assertion: create(SpaceGenesisSchema, {
          spaceKey: fromPublicKey(space),
          membershipPolicy: MembershipPolicy.INVITE,
        }),
        signer: keyring,
      }),
      { sourceFeed: feed },
    );

    expect(spaceState.tags).toEqual([]);
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
            spaceKey: fromPublicKey(haloSpace),
            membershipPolicy: MembershipPolicy.INVITE,
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
            spaceKey: fromPublicKey(haloSpace),
            role: SpaceMember_Role.ADMIN,
            genesisFeedKey: fromPublicKey(feed),
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
            identityKey: fromPublicKey(identity),
            haloKey: fromPublicKey(haloSpace),
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    // Admit device2 to the identity.
    expect(
      await haloState.process(
        await createCredential({
          assertion: create(AuthorizedDeviceSchema, {
            deviceKey: fromPublicKey(device1),
            identityKey: fromPublicKey(identity),
          }),
          subject: device1,
          issuer: identity,
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
            deviceKey: fromPublicKey(device2),
            identityKey: fromPublicKey(identity),
          }),
          subject: device2,
          issuer: identity,
          signingKey: device1,
          // Create the keychain for device1 using credentials from the space.
          chain: create(ChainSchema, { credential: deviceAuthorization(haloState, device1) }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    // Issue a feed admit credential using the chain,
    const credential = await createCredential({
      assertion: create(AdmittedFeedSchema, {
        spaceKey: fromPublicKey(haloSpace),
        deviceKey: fromPublicKey(device2),
        designation: AdmittedFeed_Designation.CONTROL,
        identityKey: fromPublicKey(identity),
      }),
      issuer: identity,
      signer: keyring,
      subject: feed,
      signingKey: device2,
      // Create the keychain for device2 using credentials from the space.
      chain: create(ChainSchema, { credential: deviceAuthorization(haloState, device2) }),
    });

    expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
  });

  test('space genesis with membership policy', async () => {
    const keyring = new Keyring();
    const space = await keyring.createKey();
    const feed = await keyring.createKey();

    const spaceState = new SpaceStateMachine(space);

    await spaceState.process(
      await createCredential({
        issuer: space,
        subject: space,
        assertion: create(SpaceGenesisSchema, {
          spaceKey: fromPublicKey(space),
          membershipPolicy: MembershipPolicy.LOCKED,
        }),
        signer: keyring,
      }),
      { sourceFeed: feed },
    );

    expect(spaceState.membershipPolicy).toEqual(MembershipPolicy.LOCKED);
  });

  test('space genesis without membership policy defaults to INVITE', async () => {
    const keyring = new Keyring();
    const space = await keyring.createKey();
    const feed = await keyring.createKey();

    const spaceState = new SpaceStateMachine(space);

    // MembershipPolicy.INVITE is the proto zero-value default.
    // Existing spaces without the field will have this value.
    await spaceState.process(
      await createCredential({
        issuer: space,
        subject: space,
        assertion: create(SpaceGenesisSchema, {
          spaceKey: fromPublicKey(space),
          membershipPolicy: MembershipPolicy.INVITE,
        }),
        signer: keyring,
      }),
      { sourceFeed: feed },
    );

    expect(spaceState.membershipPolicy).toEqual(MembershipPolicy.INVITE);
  });

  test('locked space rejects new members', async ({ expect }) => {
    const keyring = new Keyring();
    const space = await keyring.createKey();
    const identity = await keyring.createKey();
    const identity2 = await keyring.createKey();
    const feed = await keyring.createKey();

    const spaceState = new SpaceStateMachine(space);

    await spaceState.process(
      await createCredential({
        issuer: space,
        subject: space,
        assertion: create(SpaceGenesisSchema, {
          spaceKey: fromPublicKey(space),
          membershipPolicy: MembershipPolicy.LOCKED,
        }),
        signer: keyring,
      }),
      { sourceFeed: feed },
    );

    await spaceState.process(
      await createCredential({
        issuer: space,
        subject: identity,
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(space),
          role: SpaceMember_Role.OWNER,
          genesisFeedKey: fromPublicKey(feed),
        }),
        signer: keyring,
      }),
      { sourceFeed: feed },
    );

    // Attempt to add a second member — should be rejected.
    expect(
      await spaceState.process(
        await createCredential({
          issuer: space,
          subject: identity2,
          assertion: create(SpaceMemberSchema, {
            spaceKey: fromPublicKey(space),
            role: SpaceMember_Role.EDITOR,
            genesisFeedKey: fromPublicKey(feed),
          }),
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(false);

    expect(spaceState.members.size).toEqual(1);
  });

  test('locked space allows admitted feeds for existing members', async ({ expect }) => {
    const keyring = new Keyring();
    const space = await keyring.createKey();
    const identity = await keyring.createKey();
    const device = await keyring.createKey();
    const feed = await keyring.createKey();
    const newFeed = await keyring.createKey();

    const spaceState = new SpaceStateMachine(space);

    await spaceState.process(
      await createCredential({
        issuer: space,
        subject: space,
        assertion: create(SpaceGenesisSchema, {
          spaceKey: fromPublicKey(space),
          membershipPolicy: MembershipPolicy.LOCKED,
        }),
        signer: keyring,
      }),
      { sourceFeed: feed },
    );

    await spaceState.process(
      await createCredential({
        issuer: space,
        subject: identity,
        assertion: create(SpaceMemberSchema, {
          spaceKey: fromPublicKey(space),
          role: SpaceMember_Role.OWNER,
          genesisFeedKey: fromPublicKey(feed),
        }),
        signer: keyring,
      }),
      { sourceFeed: feed },
    );

    const chain = create(ChainSchema, {
      credential: await createCredential({
        assertion: create(AuthorizedDeviceSchema, {
          deviceKey: fromPublicKey(device),
          identityKey: fromPublicKey(identity),
        }),
        subject: device,
        issuer: identity,
        signer: keyring,
      }),
    });

    // AdmittedFeed should still work on locked space.
    expect(
      await spaceState.process(
        await createCredential({
          issuer: identity,
          subject: newFeed,
          assertion: create(AdmittedFeedSchema, {
            spaceKey: fromPublicKey(space),
            identityKey: fromPublicKey(identity),
            deviceKey: fromPublicKey(device),
            designation: AdmittedFeed_Designation.CONTROL,
          }),
          signer: keyring,
          signingKey: device,
          chain,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    expect(spaceState.feeds.size).toEqual(1);
  });
});

// The keychain a device signs with is the space's own AuthorizedDevice credential for it.
const deviceAuthorization = (state: SpaceState, deviceKey: PublicKey): Credential => {
  const credential = state.credentials.find(
    (candidate) =>
      getCredentialAssertion(candidate).$typeName === 'dxos.halo.credentials.AuthorizedDevice' &&
      subjectIdOf(candidate).equals(deviceKey),
  );
  invariant(credential, 'Device is not authorized in this space.');
  return credential;
};
