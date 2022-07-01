import { PublicKey } from "@dxos/crypto";
import { Credential, DeviceClaim, MemberClaim } from "../proto";
import { VerifiedCredential } from "../verified-credential";

export interface FeedInfo {
  key: PublicKey
  addedBy: PublicKey
  /**
   * Feed key of where the FeedAdmit message was written. 
   */
  parentFeed?: PublicKey
}

export interface FeedsState {
  party: PublicKey
  feeds: FeedInfo[]
}

export function createFeedsState(party: PublicKey): FeedsState {
  return {
    party,
    feeds: [],
  }
}

export function createFeedsProcessor(isAuthorized: (key: PublicKey) => boolean) {
  return (state: FeedsState, credential: VerifiedCredential): FeedsState => {
    switch(credential.claim['@type']) {
      case 'dxos.halo.credentials.FeedAdmitClaim': {
        const issuer = credential.findProof(signer => isAuthorized(signer))
        if(!issuer) return state

        if(!credential.claim.party?.equals(state.party)) return state
  
        return {
          ...state,
          feeds: [
            ...state.feeds,
            {
              key: credential.claim.feed!,
              addedBy: issuer.signer!,
              parentFeed: credential.feedKey,
            },
          ]
        }
      }
      default:
        return state
    }
  }
}

export function getFeedInfo(state: FeedsState, feedKey: PublicKey) {
  return state.feeds.find(m => m.key.equals(feedKey))
}