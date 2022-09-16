//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Keyring } from '@dxos/keyring';

import { createCredential, verifyCredential } from '../credentials';
import { AdmittedFeed, Chain, PartyMember } from '../proto';
import { PartyStateMachine } from './party-state-machine';

describe('PartyStateMachine', () => {
  it('basic party creation', async () => {
    const keyring = new Keyring();
    const party = await keyring.createKey();
    const identity = await keyring.createKey();
    const device = await keyring.createKey();
    const feed = await keyring.createKey();

    const partyState = new PartyStateMachine(party);

    expect(await partyState.process(await createCredential({
      issuer: party,
      subject: party,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyGenesis',
        partyKey: party
      },
      keyring
    }), feed)).toEqual(true);

    expect(await partyState.process(await createCredential({
      issuer: party,
      subject: identity,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyMember',
        partyKey: party,
        role: PartyMember.Role.ADMIN
      },
      keyring
    }), feed)).toEqual(true);

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

    expect(await partyState.process(await createCredential({
      issuer: identity,
      subject: feed,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: party,
        identityKey: identity,
        deviceKey: device,
        designation: AdmittedFeed.Designation.CONTROL
      },
      keyring,
      signer: device,
      chain
    }), feed)).toEqual(true);

    expect(partyState.genesisCredential).toBeDefined();
    expect(Array.from(partyState.members.values())).toMatchObject([
      {
        key: identity,
        assertion: {
          partyKey: party,
          role: PartyMember.Role.ADMIN
        }
      }
    ]);
    expect(Array.from(partyState.feeds.values())).toMatchObject([
      {
        key: feed,
        assertion: {
          partyKey: party,
          identityKey: identity,
          deviceKey: device,
          designation: AdmittedFeed.Designation.CONTROL
        }
      }
    ]);
    expect(partyState.credentials).toHaveLength(3);
  });

  it('admitting a member', async () => {
    const keyring = new Keyring();
    const party = await keyring.createKey();
    const identity = await keyring.createKey();
    const device = await keyring.createKey();
    const feed = await keyring.createKey();
    const identity2 = await keyring.createKey();

    const partyState = new PartyStateMachine(party);

    // Create the party genesis credential.`
    expect(await partyState.process(await createCredential({
      issuer: party,
      subject: party,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyGenesis',
        partyKey: party
      },
      keyring
    }), feed)).toEqual(true);

    // Create the party member credential.
    expect(await partyState.process(await createCredential({
      issuer: party,
      subject: identity,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyMember',
        partyKey: party,
        role: PartyMember.Role.ADMIN
      },
      keyring
    }), feed)).toEqual(true);

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

    expect(await partyState.process(await createCredential({
      issuer: identity,
      subject: identity2,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyMember',
        partyKey: party,
        role: PartyMember.Role.MEMBER
      },
      keyring,
      signer: device,
      chain
    }), feed)).toEqual(true);

    expect(partyState.genesisCredential).toBeDefined();
    expect(Array.from(partyState.members.values())).toMatchObject([
      {
        key: identity,
        assertion: {
          partyKey: party,
          role: PartyMember.Role.ADMIN
        }
      },
      {
        key: identity2,
        assertion: {
          partyKey: party,
          role: PartyMember.Role.MEMBER
        }
      }
    ]);
    expect(Array.from(partyState.feeds.values())).toMatchObject([]);
    expect(partyState.credentials).toHaveLength(3);
  });

  it('storing device credentials and building a chain', async () => {
    const keyring = new Keyring();
    const haloParty = await keyring.createKey();
    const identity = await keyring.createKey();
    const device1 = await keyring.createKey();
    const device2 = await keyring.createKey();
    const feed = await keyring.createKey();

    const haloState = new PartyStateMachine(haloParty);

    // Create the party genesis credential.
    expect(await haloState.process(await createCredential({
      issuer: haloParty,
      subject: haloParty,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyGenesis',
        partyKey: haloParty
      },
      keyring
    }), feed)).toEqual(true);

    // Admit the identity to the party.
    expect(await haloState.process(await createCredential({
      issuer: haloParty,
      subject: identity,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyMember',
        partyKey: haloParty,
        role: PartyMember.Role.ADMIN
      },
      keyring
    }), feed)).toEqual(true);

    // Assign the HALO party to the identity.
    expect(await haloState.process(await createCredential({
      issuer: identity,
      subject: identity,
      assertion: {
        '@type': 'dxos.halo.credentials.HaloSpace',
        identityKey: identity,
        haloKey: haloParty
      },
      keyring
    }), feed)).toEqual(true);

    // Admit device2 to the identity.
    expect(await haloState.process(await createCredential({
      assertion: {
        '@type': 'dxos.halo.credentials.AuthorizedDevice',
        deviceKey: device1,
        identityKey: identity
      },
      subject: device1,
      issuer: identity,
      keyring
    }), feed)).toEqual(true);

    // Admit device1 to the identity.
    expect(await haloState.process(await createCredential({
      assertion: {
        '@type': 'dxos.halo.credentials.AuthorizedDevice',
        deviceKey: device2,
        identityKey: identity
      },
      subject: device2,
      issuer: identity,
      signer: device1,
      // Create the keychain for device1 using credentials from the party.
      chain: {
        credential: haloState.credentials.find(c => c.subject.assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice' && c.subject.id.equals(device1))!
      },
      keyring
    }), feed)).toEqual(true);

    // Issue a feed admit credential using the chain,
    const credential = await createCredential({
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: haloParty,
        deviceKey: device2,
        designation: AdmittedFeed.Designation.CONTROL,
        identityKey: identity
      },
      issuer: identity,
      keyring,
      subject: feed,
      signer: device2,
      // Create the keychain for device2 using credentials from the party.
      chain: {
        credential: haloState.credentials.find(c => c.subject.assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice' && c.subject.id.equals(device2))!
      }
    });

    expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
  });
});
