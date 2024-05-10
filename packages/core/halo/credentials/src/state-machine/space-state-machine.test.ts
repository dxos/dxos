//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Keyring } from '@dxos/keyring';
import { AdmittedFeed, type Chain, SpaceMember } from '@dxos/protocols/proto/dxos/halo/credentials';
import { describe, test } from '@dxos/test';

import { SpaceStateMachine } from './space-state-machine';
import { createCredential, verifyCredential } from '../credentials';

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
          assertion: {
            '@type': 'dxos.halo.credentials.SpaceGenesis',
            spaceKey: space,
          },
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
          assertion: {
            '@type': 'dxos.halo.credentials.SpaceMember',
            spaceKey: space,
            role: SpaceMember.Role.ADMIN,
            genesisFeedKey: feed,
          },
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

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

    expect(
      await spaceState.process(
        await createCredential({
          issuer: identity,
          subject: feed,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey: space,
            identityKey: identity,
            deviceKey: device,
            designation: AdmittedFeed.Designation.CONTROL,
          },
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
          spaceKey: space,
          role: SpaceMember.Role.ADMIN,
        },
      },
    ]);
    expect(Array.from(spaceState.feeds.values())).toMatchObject([
      {
        key: feed,
        assertion: {
          spaceKey: space,
          identityKey: identity,
          deviceKey: device,
          designation: AdmittedFeed.Designation.CONTROL,
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
          assertion: {
            '@type': 'dxos.halo.credentials.SpaceGenesis',
            spaceKey: space,
          },
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
          assertion: {
            '@type': 'dxos.halo.credentials.SpaceMember',
            spaceKey: space,
            role: SpaceMember.Role.ADMIN,
            genesisFeedKey: feed,
          },
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

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

    expect(
      await spaceState.process(
        await createCredential({
          issuer: identity,
          subject: identity2,
          assertion: {
            '@type': 'dxos.halo.credentials.SpaceMember',
            spaceKey: space,
            role: SpaceMember.Role.EDITOR,
            genesisFeedKey: feed,
          },
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
          spaceKey: space,
          role: SpaceMember.Role.ADMIN,
        },
      },
      {
        key: identity2,
        assertion: {
          spaceKey: space,
          role: SpaceMember.Role.EDITOR,
        },
      },
    ]);
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
          assertion: {
            '@type': 'dxos.halo.credentials.SpaceGenesis',
            spaceKey: haloSpace,
          },
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
          assertion: {
            '@type': 'dxos.halo.credentials.SpaceMember',
            spaceKey: haloSpace,
            role: SpaceMember.Role.ADMIN,
            genesisFeedKey: feed,
          },
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
          assertion: {
            '@type': 'dxos.halo.credentials.HaloSpace',
            identityKey: identity,
            haloKey: haloSpace,
          },
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    // Admit device2 to the identity.
    expect(
      await haloState.process(
        await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device1,
            identityKey: identity,
          },
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
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device2,
            identityKey: identity,
          },
          subject: device2,
          issuer: identity,
          signingKey: device1,
          // Create the keychain for device1 using credentials from the space.
          chain: {
            credential: haloState.credentials.find(
              (c) =>
                c.subject.assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice' &&
                c.subject.id.equals(device1),
            )!,
          },
          signer: keyring,
        }),
        { sourceFeed: feed },
      ),
    ).toEqual(true);

    // Issue a feed admit credential using the chain,
    const credential = await createCredential({
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        spaceKey: haloSpace,
        deviceKey: device2,
        designation: AdmittedFeed.Designation.CONTROL,
        identityKey: identity,
      },
      issuer: identity,
      signer: keyring,
      subject: feed,
      signingKey: device2,
      // Create the keychain for device2 using credentials from the space.
      chain: {
        credential: haloState.credentials.find(
          (c) =>
            c.subject.assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice' && c.subject.id.equals(device2),
        )!,
      },
    });

    expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
  });
});
