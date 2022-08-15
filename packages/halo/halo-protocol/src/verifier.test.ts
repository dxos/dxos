import { Keyring, KeyType } from '@dxos/credentials'
import { PublicKey } from '@dxos/protocols';
import { createCredential } from './credential-factory';
import { Credential } from './proto';
import { it as test } from 'mocha'

describe('verifier', () => {
  describe('no chain', () => {
    test('pass', async () => {
      const keyring = new Keyring();
      const { publicKey: issuer } = await keyring.createKeyRecord({ type: KeyType.IDENTITY })
      const partyKey = PublicKey.random()
      const subject = PublicKey.random()

      const credential = await createCredential({
        assertion: {
          '@type': 'dxos.halo.credentials.PartyMember',
          partyKey,
        },
        issuer,
        keyring,
        subject
      })

      console.log(credential)
    })
  })
})
