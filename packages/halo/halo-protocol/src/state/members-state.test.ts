import { PublicKey } from "@dxos/crypto"
import { Credential } from "../proto"
import { createDevicesState, processDevicesCredential } from "./devices-state"
import expect from 'expect'
import { createMembersProcessor, createMembersState } from "./members-state"

describe('MembersStateMachine', () => {
  it('can add members', () => {
    const party = PublicKey.random()
    const member = PublicKey.random()

    const state = createMembersState(party)
    const processor = createMembersProcessor(key => state.party.equals(key))

    const credential: Credential = {
      claim: {
        '@type': 'dxos.halo.credentials.MemberClaim',
        party,
        identity: member
      },
      signatures: [{
        signer: party
      }]
    }

    const newState = processor(state, credential)
    expect(newState.members[0].key.equals(member)).toBeTruthy()
    expect(newState.members[0].addedBy.equals(party)).toBeTruthy()
  })
})