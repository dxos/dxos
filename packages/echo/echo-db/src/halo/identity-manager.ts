//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event, synchronized, waitForCondition } from '@dxos/async';
import { Keyring, SecretProvider } from '@dxos/credentials';

import { InvitationDescriptor } from '../invitations';
import { PartyInternal } from '../parties';
import { HaloCreationOptions, HaloFactory } from './halo-factory';
import { HaloParty } from './halo-party';
import { Identity } from './identity';

const log = debug('dxos:echo:parties:identity-manager');

/**
 * Manages the keyring and HALO party.
 */
// TODO(burdon): This should be merge with KeyRing and HaloParty.
//   Factor out HaloParty life-cycle (create/join, etc.) from usage (identity, device, preferences, contacts).
//   Need abstraction: since identityManager.halo is called from many places.
//   ECHO => PartyManager => IdentityManaager => HaloParty
export class IdentityManager {
  private _identity: Identity;

  public readonly ready = new Event();

  constructor (
    private readonly _keyring: Keyring,
    private readonly _haloFactory: HaloFactory
  ) {
    this._identity = new Identity(_keyring, undefined);
  }

  get identity () {
    return this._identity;
  }

  get initialized () {
    return this._identity.halo !== undefined;
  }

  private async _initialize (halo: PartyInternal) {
    assert(this._identity.identityKey, 'No identity key.');
    assert(this._identity.deviceKey, 'No device key.');
    assert(halo.isOpen, 'Halo must be open.');

    const haloParty = new HaloParty(halo, this._identity.identityKey!.publicKey, this._identity.deviceKey.publicKey);
    this._identity = new Identity(this._keyring, haloParty);

    // Wait for the minimum set of keys and messages we need for proper function.
    await waitForCondition(() =>
      haloParty!.memberKeys.length &&
      haloParty!.identityGenesis &&
      this._identity.deviceKeyChain
    );

    log('HALO initialized.');
    this.ready.emit();
  }

  @synchronized
  async loadFromStorage () {
    if (this._identity.identityKey) {
      if (this._haloFactory.hasFeedForParty(this._identity.identityKey.publicKey)) {
        // TODO(marik-d): Snapshots for halo party?
        const halo = await this._haloFactory.constructParty(this._identity.identityKey.publicKey);
        // Always open the HALO.
        await halo.open();
        await this._initialize(halo);
      } else if (!this._identity.keyring.hasSecretKey(this._identity.identityKey)) {
        throw new Error('HALO missing and identity key has no secret.');
      }
    }
  }

  /**
   * Creates the Identity HALO.
   */
   @synchronized
  async createHalo (options: HaloCreationOptions = {}): Promise<PartyInternal> {
    assert(!this._identity.halo, 'HALO already exists.');

    const halo = await this._haloFactory.createHalo(options);
    await this._initialize(halo);
    return halo;
  }

   /**
    * Joins an existing Identity HALO from a recovery seed phrase.
    * TODO(telackey): Combine with joinHalo?
    *   joinHalo({ seedPhrase }) // <- Recovery version
    *   joinHalo({ invitationDescriptor, secretProvider}) // <- Standard invitation version
    * The downside is that would wreck the symmetry to createParty/joinParty.
    */
   @synchronized
   async recoverHalo (seedPhrase: string) {
     assert(!this._identity.halo, 'HALO already exists.');
     assert(!this._identity.identityKey, 'Identity key already exists.');

     const halo = await this._haloFactory.recoverHalo(this.identity, seedPhrase);
     await this._initialize(halo);
     return halo;
   }

   /**
    * Joins an existing Identity HALO.
    */
   @synchronized
   async joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
     assert(!this._identity.halo, 'HALO already exists.');

     const halo = await this._haloFactory.joinHalo(invitationDescriptor, secretProvider);
     await this._initialize(halo);
     return halo;
   }
}
