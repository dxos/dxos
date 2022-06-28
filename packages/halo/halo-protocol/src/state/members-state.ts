import { PublicKey } from "@dxos/crypto";
import { Credential, DeviceClaim, MemberClaim } from "../proto";

export interface MembersState {
  party: PublicKey
  members: {
    key: PublicKey
    addedBy: PublicKey
  }[]
}

export function createMembersState(party: PublicKey): MembersState {
  return {
    party,
    members: [],
  }
}

export function createMembersProcessor(isAuthorized: (key: PublicKey) => boolean) {
  return (state: MembersState, credential: Credential): MembersState => {
    switch(credential.claim['@type']) {
      case 'dxos.halo.credentials.MemberClaim': {
        const claim = credential.claim as MemberClaim
        
        const issuer = credential.signatures?.find(sig => isAuthorized(sig.signer!))
        if(!issuer) return state
  
        return {
          ...state,
          members: [
            ...state.members,
            {
              key: claim.identity!,
              addedBy: issuer.signer!,
            }
          ]
        }
      }
      default:
        return state
    }
  }
}

export function isAdmittedMember(state: MembersState, key: PublicKey) {
  return state.members.some(m => m.key.equals(key))
}