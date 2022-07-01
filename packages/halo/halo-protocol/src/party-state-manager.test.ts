import { PublicKey } from '@dxos/crypto'
import { it as test } from 'mocha'
import { PartyStateManager } from './party-state-mananger'
import expect from 'expect'
import { AuthChallenge, AuthResponse } from './proto'
import { randomBytes } from 'crypto'

describe('PartyStateManager', () => {
  it('inviting members with devices', async () => {
    const party = PublicKey.random()
    const identity = PublicKey.random()
    const device1 = PublicKey.random()
    const device2 = PublicKey.random()
    
    const manager = new PartyStateManager(party);
    expect(manager.isAdmittedMember(identity)).toBeFalsy()
    expect(manager.isAdmittedMemberWithDevice(identity, device1)).toBeFalsy()
    expect(manager.isAdmittedMemberWithDevice(identity, device2)).toBeFalsy()

    await manager.processCredential({
      claim: {
        '@type': 'dxos.halo.credentials.MemberClaim',
        party,
        identity: identity
      },
      proofs: [{
        signer: party
      }]
    })
    expect(manager.isAdmittedMember(identity)).toBeTruthy()
    expect(manager.isAdmittedMemberWithDevice(identity, device1)).toBeFalsy()
    expect(manager.isAdmittedMemberWithDevice(identity, device2)).toBeFalsy()

    await manager.processCredential({
      claim: {
        '@type': 'dxos.halo.credentials.DeviceClaim',
        identity,
        device: device1
      },
      proofs: [{
        signer: identity
      }]
    })
    expect(manager.isAdmittedMember(identity)).toBeTruthy()
    expect(manager.isAdmittedMemberWithDevice(identity, device1)).toBeTruthy()
    expect(manager.isAdmittedMemberWithDevice(identity, device2)).toBeFalsy()

    await manager.processCredential({
      claim: {
        '@type': 'dxos.halo.credentials.DeviceClaim',
        identity,
        device: device2
      },
      proofs: [{
        signer: device1
      }]
    })
    expect(manager.isAdmittedMember(identity)).toBeTruthy()
    expect(manager.isAdmittedMemberWithDevice(identity, device1)).toBeTruthy()
    expect(manager.isAdmittedMemberWithDevice(identity, device2)).toBeTruthy()
  })

  describe('authentication', () => {
    test('can authenticate as a member and a known device', async () => {
      const party = PublicKey.random()
      const identity = PublicKey.random()
      const device1 = PublicKey.random()
      const device2 = PublicKey.random()

      const manager = new PartyStateManager(party);
      await manager.processCredential({
        claim: {
          '@type': 'dxos.halo.credentials.MemberClaim',
          party,
          identity: identity
        },
        proofs: [{
          signer: party
        }]
      })

      const challenge: AuthChallenge = {
        nonce: randomBytes(32)
      }
      const response: AuthResponse = {
        auth: {
          claim: {
            '@type': 'dxos.halo.credentials.AuthClaim',
            party,
            identity,
            device: device2
          },
          proofs: [{
            signer: device2,
            nonce: challenge.nonce,
          }]
        },
        supporting: [
          {
            claim: {
              '@type': 'dxos.halo.credentials.DeviceClaim',
              identity,
              device: device1
            },
            proofs: [{
              signer: identity
            }]
          },
          {
            claim: {
              '@type': 'dxos.halo.credentials.DeviceClaim',
              identity,
              device: device2
            },
            proofs: [{
              signer: device1
            }]
          }
        ]
      }
      expect(await manager.authenticate(challenge, response)).toEqual(true)
    })
  })
})