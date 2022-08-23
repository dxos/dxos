//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Keyring, KeyType } from '@dxos/credentials';

import { buildDeviceChain, createCredential, verifyCredential } from '../credentials';
import { AdmittedFeed, PartyMember } from '../proto';
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
        roles: [PartyMember.Role.ADMIN, PartyMember.Role.WRITER, PartyMember.Role.MEMBER]
      },
      keyring
    }), feed)).toEqual(true);

    const chain = buildDeviceChain({
      credentials: [
        await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity
          },
          subject: device,
          issuer: identity,
          keyring
        })
      ],
      device,
      identity
    });

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
          roles: [PartyMember.Role.ADMIN, PartyMember.Role.WRITER, PartyMember.Role.MEMBER]
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
        roles: [PartyMember.Role.ADMIN, PartyMember.Role.WRITER, PartyMember.Role.MEMBER]
      },
      keyring
    }), feed)).toEqual(true);

    const chain = buildDeviceChain({
      credentials: [
        await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity
          },
          subject: device,
          issuer: identity,
          keyring
        })
      ],
      device,
      identity
    });

    expect(await partyState.process(await createCredential({
      issuer: identity,
      subject: identity2,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyMember',
        partyKey: party,
        roles: [PartyMember.Role.WRITER, PartyMember.Role.MEMBER]
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
          roles: [PartyMember.Role.ADMIN, PartyMember.Role.WRITER, PartyMember.Role.MEMBER]
        }
      },
      {
        key: identity2,
        assertion: {
          partyKey: party,
          roles: [PartyMember.Role.WRITER, PartyMember.Role.MEMBER]
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

    expect(await haloState.process(await createCredential({
      issuer: haloParty,
      subject: haloParty,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyGenesis',
        partyKey: haloParty
      },
      keyring
    }), feed)).toEqual(true);

    expect(await haloState.process(await createCredential({
      issuer: haloParty,
      subject: identity,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyMember',
        partyKey: haloParty,
        roles: [PartyMember.Role.ADMIN, PartyMember.Role.WRITER, PartyMember.Role.MEMBER]
      },
      keyring
    }), feed)).toEqual(true);

    expect(await haloState.process(await createCredential({
      issuer: haloParty,
      subject: identity,
      assertion: {
        '@type': 'dxos.halo.credentials.HaloSpace',
        identityKey: identity,
        privateHalo: haloParty,
      },
      keyring
    }), feed)).toEqual(true);

    expect(await haloState.process(await createCredential({
      assertion: {
        '@type': 'dxos.halo.credentials.AuthorizedDevice',
        deviceKey: device2,
        identityKey: identity
      },
      subject: device2,
      issuer: device1,
      keyring
    }), feed)).toEqual(true);
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

    const chain = buildDeviceChain({
      credentials: haloState.credentials,
      device: device2,
      identity,
    })

    const credential = await createCredential({
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: haloParty,
        deviceKey: device2,
        designation: AdmittedFeed.Designation.CONTROL,
        identityKey: identity,
      },
      issuer: identity,
      keyring,
      subject: feed,
      signingKey: device2,
      chain
    });

    expect(await verifyCredential(credential)).toEqual({ kind: 'pass' });
  })
});
