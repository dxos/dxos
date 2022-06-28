import { PublicKey } from "@dxos/crypto";
import { Credential, DeviceClaim } from "../proto";
import { VerifiedCredential } from "../verified-credential";

export interface DevicesState {
  identity: PublicKey
  devices: {
    key: PublicKey
    addedBy: PublicKey
  }[]
}

export function createDevicesState(identity: PublicKey): DevicesState {
  return {
    identity,
    devices: [],
  }
}

export function processDevicesCredential(state: DevicesState, credential: VerifiedCredential): DevicesState {
  switch(credential.claim['@type']) {
    case 'dxos.halo.credentials.DeviceClaim': {
      const issuer = credential.findProof(signer => 
        state.identity.equals(signer) || isAdmittedDevice(state, signer)
      )
      if(!issuer) return state

      return {
        ...state,
        devices: [
          ...state.devices,
          {
            key: credential.claim.device!,
            addedBy: issuer.signer!,
          }
        ]
      }
    }
    default:
      return state
  }
}

export function isAdmittedDevice(state: DevicesState, key: PublicKey) {
  return state.devices.some(device => device.key.equals(key))
}