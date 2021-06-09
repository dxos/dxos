//
// Copyright 2021 DXOS.org
//

import { KeyChain, KeyRecord, SignedMessage } from '@dxos/credentials';

import { HaloParty } from './halo-party';
import { IdentityManager } from './identity-manager';

/**
 * Represents users identity exposing access to signing keys and HALO party.
 * 
 * Acts as a read-only view into IdentityManager.
 */
export class Identity {
  // TODO(marik-d): Take only necessary dependencies.
  constructor (private readonly _identityManager: IdentityManager) {}

  get keyring () {
    return this._identityManager.keyring;
  }

  // TODO(burdon): Move to KeyRing?
  get identityKey (): KeyRecord | undefined {
    return this._identityManager.identityKey;
  }

  // TODO(burdon): Move to KeyRing?
  get deviceKey (): KeyRecord | undefined {
    return this._identityManager.deviceKey;
  }

  get displayName (): string | undefined {
    return this._identityManager.displayName;
  }

  get identityInfo (): SignedMessage | undefined {
    return this._identityManager.identityInfo;
  }

  get identityGenesis (): SignedMessage | undefined {
    return this._identityManager.identityGenesis;
  }

  get deviceKeyChain (): KeyChain | undefined {
    return this._identityManager.deviceKeyChain;
  }

  get halo (): HaloParty | undefined {
    return this._identityManager.halo;
  }

  // TODO(marik-d): Remove.
  get identityManager (): IdentityManager {
    return this._identityManager;
  }
}

export type IdentityProvider = () => Identity;
