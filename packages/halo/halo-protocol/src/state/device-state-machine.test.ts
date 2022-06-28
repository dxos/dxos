import { PublicKey } from "@dxos/crypto"
import { Credential } from "../proto"
import { createNewState, processCredential } from "./device-state-machine"
import expect from 'expect'

describe('DeviceStateMachine', () => {
  it('can add devices', () => {
    const identity = PublicKey.random()
    const device = PublicKey.random()

    const state = createNewState(identity)

    const credential: Credential = {
      claim: {
        '@type': 'dxos.halo.credentials.DeviceClaim',
        identity,
        device
      },
      signatures: [{
        signer: identity
      }]
    }

    const newState = processCredential(state, credential)
    expect(newState.devices[0].key.equals(device)).toBeTruthy()
    expect(newState.devices[0].addedBy.equals(identity)).toBeTruthy()
  })
})