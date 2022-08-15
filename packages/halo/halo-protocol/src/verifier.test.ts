import { Keyring, KeyType } from '@dxos/credentials'
import { PublicKey } from '@dxos/protocols';
import { createCredential } from './credential-factory';
import { Credential } from './proto';
import { it as test } from 'mocha'
import { verifyCredential } from './verifier';
import expect from 'expect'

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

      expect(await verifyCredential(credential)).toEqual({ kind: 'pass' })
    })
  })
})
