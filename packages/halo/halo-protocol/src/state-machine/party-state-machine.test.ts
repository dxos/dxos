import { Keyring, KeyType } from '@dxos/credentials';
import expect from 'expect';
import { buildDeviceChain, createCredential } from '../credentials';
import { AdmittedFeed, PartyMember } from '../proto';
import { PartyStateMachine } from './party-state-machine';

describe('PartyStateMachine', () => {
  it('basic party creation', async () => {
    const keyring = new Keyring();
    const { publicKey: party } = await keyring.createKeyRecord({ type: KeyType.PARTY });
    const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const { publicKey: device } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });
    const { publicKey: feed } = await keyring.createKeyRecord({ type: KeyType.IDENTITY });

    const partyState = new PartyStateMachine(party);
    
    expect(await partyState.process(await createCredential({
      issuer: party,
      subject: party,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyGenesis',
        partyKey: party,
      },
      keyring,
    }), feed)).toEqual(true)

    expect(await partyState.process(await createCredential({
      issuer: party,
      subject: identity,
      assertion: {
        '@type': 'dxos.halo.credentials.PartyMember',
        partyKey: party,
        roles: [PartyMember.Role.ADMIN, PartyMember.Role.WRITER, PartyMember.Role.MEMBER],
      },
      keyring,
    }), feed)).toEqual(true)

    const chain = buildDeviceChain({
      credentials: [
        await createCredential({
          assertion: {
            '@type': 'dxos.halo.credentials.AuthorizedDevice',
            deviceKey: device,
            identityKey: identity,
          },
          subject: device,
          issuer: identity,
          keyring,
        })
      ],
      device,
      identity,
    })

    expect(await partyState.process(await createCredential({
      issuer: identity,
      subject: feed,
      assertion: {
        '@type': 'dxos.halo.credentials.AdmittedFeed',
        partyKey: party,
        identityKey: identity,
        deviceKey: device,
        designation: AdmittedFeed.Designation.CONTROL,
      },
      keyring,
      signingKey: device,
      chain,
    }), feed)).toEqual(true)
  });
});