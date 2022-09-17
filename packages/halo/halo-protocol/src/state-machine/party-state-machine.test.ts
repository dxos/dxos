//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Keyring } from '@dxos/credentials';
import { KeyType } from '@dxos/protocols/proto/dxos/halo/keys';

import { createCredential, verifyCredential } from '../credentials';
import { AdmittedFeed, Chain, PartyMember } from '../proto';
import { PartyStateMachine } from './party-state-machine';

describe('PartyStateMachine', () => {
  it('basic party creation', async () => {
    const keyring = new Keyring();
    const { publicKey: party } = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const { publicKey: device } = await keyring.createKeyRecord({ type: KeyType.DEVICE });
    const { publicKey: feed } = await keyring.createKeyRecord({ type: KeyType.FEED });

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
      signingKey: device,
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
    const { publicKey: party } = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const { publicKey: device } = await keyring.createKeyRecord({ type: KeyType.DEVICE });
    const { publicKey: feed } = await keyring.createKeyRecord({ type: KeyType.FEED });
    const { publicKey: identity2 } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });

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
      signingKey: device,
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
    const { publicKey: haloParty } = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const { publicKey: device1 } = await keyring.createKeyRecord({ type: KeyType.DEVICE });
    const { publicKey: device2 } = await keyring.createKeyRecord({ type: KeyType.DEVICE });
    const { publicKey: feed } = await keyring.createKeyRecord({ type: KeyType.FEED });

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
      signingKey: device1,
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
      signingKey: device2,
      // Create the keychain for device2 using credentials from the party.
      chain: {
        credential: haloState.credentials.find(c => c.subject.assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice' && c.subject.id.equals(device2))!
      }
    });

    expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
  });
});
