import { PublicKey } from "@dxos/crypto";
import { Credential, DeviceClaim } from "../proto";
import { VerifiedCredential } from "../verified-credential";
import { createDevicesState, DevicesState, isAdmittedDevice, processDevicesCredential } from "./devices-state";
import { createFeedsProcessor, createFeedsState, FeedsState } from "./feed-state";
import { createMembersProcessor, createMembersState, isAdmittedMember, MembersState } from "./members-state";

export interface PartyState {
  party: PublicKey
  members: MembersState
  memberDevices: Record<string, DevicesState>
  feeds: FeedsState,
}

export function createPartyState(party: PublicKey): PartyState {
  return {
    party,
    members: createMembersState(party),
    memberDevices: {},
    feeds: createFeedsState(party)
  }
}

export function processPartyCredential(state: PartyState, credential: VerifiedCredential): PartyState {
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
      const memberState = getDevicesState(state, credential.claim.identity!)

      return {
        ...state,
        memberDevices: {
          ...state.memberDevices,
          [credential.claim.identity!.toHex()]: processDevicesCredential(memberState, credential),
        }
      }
    }
    case 'dxos.halo.credentials.FeedAdmitClaim': {
      return {
        ...state,
        feeds: createFeedsProcessor(key => 
          key.equals(state.party) || isPartyMemberIdentityOrDevice(state, key)
        )(state.feeds, credential)
      }
    }
    default:
      return state
  }
}

export function getDevicesState(state: PartyState, identity: PublicKey): DevicesState {
  return state.memberDevices[identity.toHex()] ?? createDevicesState(identity)
}

export function isPartyMemberIdentityOrDevice(state: PartyState, key: PublicKey) {
  if(isAdmittedMember(state.members, key)) {
    return true
  }

  return Object.values(state.memberDevices).some(s =>
    isAdmittedDevice(s, key) && isAdmittedMember(state.members, s.identity)
  )
}

export function isAdmittedMemberWithDevice(state: PartyState, identity: PublicKey, device: PublicKey) {
  if(!isAdmittedMember(state.members, identity)) {
    return false
  }

  const memberState = getDevicesState(state, identity)
  return isAdmittedDevice(memberState, device)
}