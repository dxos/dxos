import { PublicKey } from '@dxos/crypto'
import { it as test } from 'mocha'
import { PartyStateManager } from './party-state-mananger'
import expect from 'expect'
import { AuthChallenge, AuthResponse } from './proto'
import { randomBytes } from 'crypto'
import { Keyring, KeyType } from '@dxos/credentials'
import { signCredential } from './crypto'

describe('PartyStateManager', () => {
  describe('members', () => {
    it('inviting members with devices', async () => {
      const keyring = new Keyring()
      const { publicKey: party } = await keyring.createKeyRecord({ type: KeyType.PARTY })
      const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY })
      const { publicKey: device1 } = await keyring.createKeyRecord({ type: KeyType.DEVICE })
      const { publicKey: device2 } = await keyring.createKeyRecord({ type: KeyType.DEVICE })
      
      const manager = new PartyStateManager(party);
      expect(manager.isAdmittedMember(identity)).toBeFalsy()
      expect(manager.isAdmittedMemberWithDevice(identity, device1)).toBeFalsy()
      expect(manager.isAdmittedMemberWithDevice(identity, device2)).toBeFalsy()

      await manager.processCredential(await signCredential({
        claim: {
          '@type': 'dxos.halo.credentials.MemberClaim',
          party,
          identity: identity
        },
        signingKeys: [party],
        signer: keyring,
      }))
      expect(manager.isAdmittedMember(identity)).toBeTruthy()
      expect(manager.isAdmittedMemberWithDevice(identity, device1)).toBeFalsy()
      expect(manager.isAdmittedMemberWithDevice(identity, device2)).toBeFalsy()

      await manager.processCredential(await signCredential({
        claim: {
          '@type': 'dxos.halo.credentials.DeviceClaim',
          identity,
          device: device1
        },
        signingKeys: [identity],
        signer: keyring,
      }))
      expect(manager.isAdmittedMember(identity)).toBeTruthy()
      expect(manager.isAdmittedMemberWithDevice(identity, device1)).toBeTruthy()
      expect(manager.isAdmittedMemberWithDevice(identity, device2)).toBeFalsy()

      await manager.processCredential(await signCredential({
        claim: {
          '@type': 'dxos.halo.credentials.DeviceClaim',
          identity,
          device: device2
        },
        signingKeys: [device1],
        signer: keyring,
      }))
      expect(manager.isAdmittedMember(identity)).toBeTruthy()
      expect(manager.isAdmittedMemberWithDevice(identity, device1)).toBeTruthy()
      expect(manager.isAdmittedMemberWithDevice(identity, device2)).toBeTruthy()
    })
  })

  describe('feeds', () => {
    it('can admit feeds', async () => {
      const keyring = new Keyring()
      const { publicKey: party } = await keyring.createKeyRecord({ type: KeyType.PARTY })
      const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY })
      const { publicKey: device1 } = await keyring.createKeyRecord({ type: KeyType.DEVICE })
      const { publicKey: device2 } = await keyring.createKeyRecord({ type: KeyType.DEVICE })
      const { publicKey: feed1 } = await keyring.createKeyRecord({ type: KeyType.FEED })
      const { publicKey: feed2 } = await keyring.createKeyRecord({ type: KeyType.FEED })
      
      const manager = new PartyStateManager(party);
      expect(manager.getFeeds()).toEqual([])

      await manager.processCredential(await signCredential({
        claim: {
          '@type': 'dxos.halo.credentials.MemberClaim',
          party,
          identity: identity
        },
        signingKeys: [party],
        signer: keyring,
      }))
      await manager.processCredential(await signCredential({
        claim: {
          '@type': 'dxos.halo.credentials.DeviceClaim',
          identity,
          device: device1
        },
        signingKeys: [identity],
        signer: keyring,
      }))
      await manager.processCredential(await signCredential({
        claim: {
          '@type': 'dxos.halo.credentials.DeviceClaim',
          identity,
          device: device2
        },
        signingKeys: [device1],
        signer: keyring,
      }))
      await manager.processCredential(await signCredential({
        claim: {
          '@type': 'dxos.halo.credentials.FeedAdmitClaim',
          party,
          feed: feed1,
        },
        signingKeys: [device1],
        signer: keyring,
      }))
      await manager.processCredential(await signCredential({
        claim: {
          '@type': 'dxos.halo.credentials.FeedAdmitClaim',
          party,
          feed: feed2,
        },
        signingKeys: [device2],
        signer: keyring,
      }))
      expect(manager.getFeeds()).toEqual([
        {
          key: feed1,
          addedBy: device1,
          parentFeed: undefined 
        },
        {
          key: feed2,
          addedBy: device2,
          parentFeed: undefined 
        },
      ])
    })
  })

  describe('authentication', () => {
    test('can authenticate as a member and a known device', async () => {
      const keyring = new Keyring()
      const { publicKey: party } = await keyring.createKeyRecord({ type: KeyType.PARTY })
      const { publicKey: identity } = await keyring.createKeyRecord({ type: KeyType.IDENTITY })
      const { publicKey: device1 } = await keyring.createKeyRecord({ type: KeyType.DEVICE })
      const { publicKey: device2 } = await keyring.createKeyRecord({ type: KeyType.DEVICE })
  
      const manager = new PartyStateManager(party);
      await manager.processCredential(await signCredential({
        claim: {
          '@type': 'dxos.halo.credentials.MemberClaim',
          party,
          identity: identity
        },
        signingKeys: [party],
        signer: keyring,
      }))

      const challenge: AuthChallenge = {
        nonce: randomBytes(32)
      }
      const response: AuthResponse = {
        auth: await signCredential({
          claim: {
            '@type': 'dxos.halo.credentials.AuthClaim',
            party,
            identity,
            device: device2
          },
          nonce: challenge.nonce,
          signer: keyring,
          signingKeys: [device2],
        }),
        supporting: [
          await signCredential({
            claim: {
              '@type': 'dxos.halo.credentials.DeviceClaim',
              identity,
              device: device1
            },
            signingKeys: [identity],
            signer: keyring,
          }),
          await signCredential({
            claim: {
              '@type': 'dxos.halo.credentials.DeviceClaim',
              identity,
              device: device2
            },
            signingKeys: [device1],
            signer: keyring,
          })
        ]
      }
      expect(await manager.authenticate(challenge, response)).toEqual(true)
    })
  })
})