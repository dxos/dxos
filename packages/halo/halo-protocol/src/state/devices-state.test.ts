import { PublicKey } from "@dxos/crypto"
import { Credential } from "../proto"
import { createDevicesState, processDevicesCredential } from "./devices-state"
import expect from 'expect'
import { VerifiedCredential } from "../verified-credential"

describe('DevicesStateMachine', () => {
  it('can add devices', () => {
    const identity = PublicKey.random()
    const device = PublicKey.random()

    const state = createDevicesState(identity)

    const credential = new VerifiedCredential({
      claim: {
        '@type': 'dxos.halo.credentials.DeviceClaim',
        identity,
        device
      },
      proofs: [{
        signer: identity
      }]
    })

    const newState = processDevicesCredential(state, credential)
    expect(newState.devices[0].key.equals(device)).toBeTruthy()
    expect(newState.devices[0].addedBy.equals(identity)).toBeTruthy()
  })
})