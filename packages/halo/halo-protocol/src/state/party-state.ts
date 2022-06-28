import { PublicKey } from "@dxos/crypto";
import { Credential, DeviceClaim } from "../proto";
import { createDevicesState, DevicesState, isAdmittedDevice, processDevicesCredential } from "./devices-state";
import { createMembersProcessor, createMembersState, isAdmittedMember, MembersState } from "./members-state";

export interface PartyState {
  party: PublicKey
  members: MembersState
  memberDevices: Record<string, DevicesState>
}

export function createPartyState(party: PublicKey): PartyState {
  return {
    party,
    members: createMembersState(party),
    memberDevices: {}
  }
}

export function processPartyCredential(state: PartyState, credential: Credential): PartyState {
  switch(credential.claim['@type']) {
    case 'dxos.halo.credentials.MemberClaim': {
      return {
        ...state,
        members: createMembersProcessor(key => 
          key.equals(state.party) || isPartyMemberIdentityOrDevice(state, key)
        )(state.members, credential)
      }
    }
    case 'dxos.halo.credentials.DeviceClaim': {
      const claim = credential.claim as DeviceClaim
      const memberState = state.memberDevices[claim.identity!.toHex()] ?? createDevicesState(claim.identity!)

      return {
        ...state,
        memberDevices: {
          ...state.memberDevices,
          [claim.identity!.toHex()]: processDevicesCredential(memberState, credential),
        }
      }
    }
    default:
      return state
  }
}

export function isPartyMemberIdentityOrDevice(state: PartyState, key: PublicKey) {
  if(isAdmittedMember(state.members, key)) {
    return true
  }

  return Object.values(state.memberDevices).some(s =>
    isAdmittedDevice(s, key) && isAdmittedMember(state.members, s.identity)
  )
}