import { PublicKey } from "@dxos/crypto"
import { Credential } from "../proto"
import { createDevicesState, processDevicesCredential } from "./devices-state"
import expect from 'expect'
import { createMembersProcessor, createMembersState } from "./members-state"
import { VerifiedCredential } from "../verified-credential"
import { createFeedsProcessor, createFeedsState, getFeedInfo } from "./feed-state"

describe('FeedsStateMachine', () => {
  it('can add feeds', () => {
    const party = PublicKey.random()
    const member = PublicKey.random()
    const feed1 = PublicKey.random()
    const feed2 = PublicKey.random()

    const processor = createFeedsProcessor(() => true)
    let state = createFeedsState(party)
    expect(getFeedInfo(state, feed1)).toBeUndefined()
    expect(getFeedInfo(state, feed2)).toBeUndefined()

    state = processor(state, new VerifiedCredential({
      claim: {
        '@type': 'dxos.halo.credentials.FeedAdmitClaim',
        party,
        feed: feed1,
      },
      proofs: [{
        signer: member
      }]
    }))
    state = processor(state, new VerifiedCredential({
      claim: {
        '@type': 'dxos.halo.credentials.FeedAdmitClaim',
        party,
        feed: feed2,
      },
      proofs: [{
        signer: member
      }]
    }, feed1))
    expect(getFeedInfo(state, feed1)).toEqual({
      key: feed1,
      addedBy: member,
      parentFeed: undefined
    })
    expect(getFeedInfo(state, feed2)).toEqual({
      key: feed2,
      addedBy: member,
      parentFeed: feed1
    })
  })
})