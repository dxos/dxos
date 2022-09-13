import { NetworkManager } from '@dxos/network-manager';
import { PublicKey } from '@dxos/protocols';
import { afterTest } from '@dxos/testutils';
import { it as test } from 'mocha'
import { MOCK_CREDENTIAL_AUTHENTICATOR, MOCK_CREDENTIAL_PROVIDER, SpaceProtocol } from './space-protocol';
import waitForExpect from 'wait-for-expect';
import expect from 'expect'

describe('space/space-protocol', () => {
  test.only('two peers discover each other', async () => {
    const topic = PublicKey.random()

    const peerId1 = PublicKey.random()
    const networkManager1 = new NetworkManager()
    const protocol1 = new SpaceProtocol(
      networkManager1,
      topic,
      {
        peerKey: peerId1,
        credentialProvider: MOCK_CREDENTIAL_PROVIDER,
        credentialAuthenticator: MOCK_CREDENTIAL_AUTHENTICATOR,
      },
      []
    )

    const peerId2 = PublicKey.random()
    const networkManager2 = new NetworkManager()
    const protocol2 = new SpaceProtocol(
      networkManager2,
      topic,
      {
        peerKey: peerId2,
        credentialProvider: MOCK_CREDENTIAL_PROVIDER,
        credentialAuthenticator: MOCK_CREDENTIAL_AUTHENTICATOR,
      },
      []
    )

    await protocol1.start()
    afterTest(() => protocol1.stop())

    await protocol2.start()
    afterTest(() => protocol2.stop())

    await waitForExpect(() => {
      expect(protocol1.peers).toContainEqual(peerId2)
      expect(protocol2.peers).toContainEqual(peerId1)
    })
  })
});