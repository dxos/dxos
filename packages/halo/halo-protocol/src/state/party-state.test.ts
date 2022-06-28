import { PublicKey } from "@dxos/crypto"
import { Credential } from "../proto"
import { createDevicesState, processDevicesCredential } from "./devices-state"
import expect from 'expect'
import { createMembersProcessor, createMembersState } from "./members-state"
import { createPartyState, isPartyMemberIdentityOrDevice, processPartyCredential } from "./party-state"

describe('PartyStateMachine', () => {
  it('inviting members with devices', () => {
    const party = PublicKey.random()
    const identity = PublicKey.random()
    const device1 = PublicKey.random()
    const device2 = PublicKey.random()

    let state = createPartyState(party)
    expect(isPartyMemberIdentityOrDevice(state, identity)).toBeFalsy()
    expect(isPartyMemberIdentityOrDevice(state, device1)).toBeFalsy()
    expect(isPartyMemberIdentityOrDevice(state, device2)).toBeFalsy()

    state = processPartyCredential(state, {
      claim: {
        '@type': 'dxos.halo.credentials.MemberClaim',
        party,
        identity: identity
      },
      signatures: [{
        signer: party
      }]
    })
    expect(isPartyMemberIdentityOrDevice(state, identity)).toBeTruthy()
    expect(isPartyMemberIdentityOrDevice(state, device1)).toBeFalsy()
    expect(isPartyMemberIdentityOrDevice(state, device2)).toBeFalsy()

    state = processPartyCredential(state, {
      claim: {
        '@type': 'dxos.halo.credentials.DeviceClaim',
        identity,
        device: device1
      },
      signatures: [{
        signer: identity
      }]
    })
    expect(isPartyMemberIdentityOrDevice(state, identity)).toBeTruthy()
    expect(isPartyMemberIdentityOrDevice(state, device1)).toBeTruthy()
    expect(isPartyMemberIdentityOrDevice(state, device2)).toBeFalsy()

    state = processPartyCredential(state, {
      claim: {
        '@type': 'dxos.halo.credentials.DeviceClaim',
        identity,
        device: device2
      },
      signatures: [{
        signer: device1
      }]
    })
    expect(isPartyMemberIdentityOrDevice(state, identity)).toBeTruthy()
    expect(isPartyMemberIdentityOrDevice(state, device1)).toBeTruthy()
    expect(isPartyMemberIdentityOrDevice(state, device2)).toBeTruthy()
  })
})