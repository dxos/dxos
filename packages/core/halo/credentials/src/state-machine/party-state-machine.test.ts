//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Keyring } from '@dxos/keyring';
import { AdmittedFeed, Chain, PartyMember } from '@dxos/protocols/proto/dxos/halo/credentials';

import { createCredential, verifyCredential } from '../credentials';
import { PartyStateMachine } from './party-state-machine';

// TODO(burdon): Rename key vars with key suffix.

describe('PartyStateMachine', function () {
  it('basic party creation', async function () {
    const keyring = new Keyring();
    const spaceKey = await keyring.createKey();
    const identityKey = await keyring.createKey();
    const deviceKey = await keyring.createKey();
    const feedKey = await keyring.createKey();

    const partyState = new PartyStateMachine(spaceKey);

    expect(
      await partyState.process(
        await createCredential({
          issuer: spaceKey,
          subject: spaceKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyGenesis',
            spaceKey
          },
          signer: keyring
        }),
        feedKey
      )
    ).toEqual(true);

    expect(
      await partyState.process(
        await createCredential({
          issuer: spaceKey,
          subject: identityKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyMember',
            spaceKey,
            role: PartyMember.Role.ADMIN
          },
          signer: keyring
        }),
        feedKey
      )
    ).toEqual(true);

    const chain: Chain = {
      credential: await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.AuthorizedDevice',
          deviceKey: deviceKey,
          identityKey: identityKey
        },
        subject: deviceKey,
        issuer: identityKey,
        signer: keyring
      })
    };

    expect(
      await partyState.process(
        await createCredential({
          issuer: identityKey,
          subject: feedKey,
          assertion: {
            '@type': 'dxos.halo.credentials.AdmittedFeed',
            spaceKey,
            identityKey: identityKey,
            deviceKey: deviceKey,
            designation: AdmittedFeed.Designation.CONTROL
          },
          signer: keyring,
          signingKey: deviceKey,
          chain
        }),
        feedKey
      )
    ).toEqual(true);

    expect(partyState.genesisCredential).toBeDefined();
    expect(Array.from(partyState.members.values())).toMatchObject([
      {
        key: identityKey,
        assertion: {
          spaceKey,
          role: PartyMember.Role.ADMIN
        }
      }
    ]);
    expect(Array.from(partyState.feeds.values())).toMatchObject([
      {
        key: feedKey,
        assertion: {
          spaceKey,
          identityKey: identityKey,
          deviceKey: deviceKey,
          designation: AdmittedFeed.Designation.CONTROL
        }
      }
    ]);
    expect(partyState.credentials).toHaveLength(3);
  });

  it('admitting a member', async function () {
    const keyring = new Keyring();
    const spaceKey = await keyring.createKey();
    const identity = await keyring.createKey();
    const device = await keyring.createKey();
    const feed = await keyring.createKey();
    const identity2 = await keyring.createKey();

    const partyState = new PartyStateMachine(spaceKey);

    // Create the party genesis credential.`
    expect(
      await partyState.process(
        await createCredential({
          issuer: spaceKey,
          subject: spaceKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyGenesis',
            spaceKey
          },
          signer: keyring
        }),
        feed
      )
    ).toEqual(true);

    // Create the party member credential.
    expect(
      await partyState.process(
        await createCredential({
          issuer: spaceKey,
          subject: identity,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyMember',
            spaceKey,
            role: PartyMember.Role.ADMIN
          },
          signer: keyring
        }),
        feed
      )
    ).toEqual(true);

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

    expect(
      await partyState.process(
        await createCredential({
          issuer: identity,
          subject: identity2,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyMember',
            spaceKey,
            role: PartyMember.Role.MEMBER
          },
          signer: keyring,
          signingKey: device,
          chain
        }),
        feed
      )
    ).toEqual(true);

    expect(partyState.genesisCredential).toBeDefined();
    expect(Array.from(partyState.members.values())).toMatchObject([
      {
        key: identity,
        assertion: {
          spaceKey,
          role: PartyMember.Role.ADMIN
        }
      },
      {
        key: identity2,
        assertion: {
          spaceKey,
          role: PartyMember.Role.MEMBER
        }
      }
    ]);
    expect(Array.from(partyState.feeds.values())).toMatchObject([]);
    expect(partyState.credentials).toHaveLength(3);
  });

  it('storing device credentials and building a chain', async function () {
    const keyring = new Keyring();
    const halospaceKey = await keyring.createKey();
    const identityKey = await keyring.createKey();
    const device1 = await keyring.createKey();
    const device2 = await keyring.createKey();
    const feedKey = await keyring.createKey();

    const haloState = new PartyStateMachine(halospaceKey);

    // Create the party genesis credential.
    expect(
      await haloState.process(
        await createCredential({
          issuer: halospaceKey,
          subject: halospaceKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyGenesis',
            spaceKey: halospaceKey
          },
          signer: keyring
        }),
        feedKey
      )
    ).toEqual(true);

    // Admit the identity to the party.
    expect(
      await haloState.process(
        await createCredential({
          issuer: halospaceKey,
          subject: identityKey,
          assertion: {
            '@type': 'dxos.halo.credentials.PartyMember',
            spaceKey: halospaceKey,
            role: PartyMember.Role.ADMIN
          },
          signer: keyring
        }),
        feedKey
      )
    ).toEqual(true);

    // Assign the HALO party to the identity.
    expect(
      await haloState.process(
        await createCredential({
          issuer: identityKey,
          subject: identityKey,
          assertion: {
            '@type': 'dxos.halo.credentials.HaloSpace',
            identityKey: identityKey,
            haloKey: halospaceKey
          },
          signer: keyring
        }),
        feedKey
      )
    ).toEqual(true);

    // Admit device2 to the identity.
    expect(
      await haloState.process(
        await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device1,
            identityKey: identityKey
          },
          subject: device1,
          issuer: identityKey,
          signer: keyring
        }),
        feedKey
      )
    ).toEqual(true);

    // Admit device1 to the identity.
    expect(
      await haloState.process(
        await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device2,
            identityKey: identityKey
          },
          subject: device2,
          issuer: identityKey,
          signingKey: device1,
          // Create the keychain for device1 using credentials from the party.
          chain: {
            credential: haloState.credentials.find(
              (c) =>
                c.subject.assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice' &&
                c.subject.id.equals(device1)
            )!
          },
          signer: keyring
        }),
        feedKey
      )
    ).toEqual(true);

    // Issue a feed admit credential using the chain,
    const credential = await createCredential({
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        spaceKey: halospaceKey,
        deviceKey: device2,
        designation: AdmittedFeed.Designation.CONTROL,
        identityKey: identityKey
      },
      issuer: identityKey,
      signer: keyring,
      subject: feedKey,
      signingKey: device2,
      // Create the keychain for device2 using credentials from the party.
      chain: {
        credential: haloState.credentials.find(
          (c) =>
            c.subject.assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice' && c.subject.id.equals(device2)
        )!
      }
    });

    expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
  });
});
