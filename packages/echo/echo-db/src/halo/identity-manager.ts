//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event, synchronized, waitForCondition } from '@dxos/async';
import { Keyring, KeyChain, KeyType, Filter, KeyRecord, SecretProvider } from '@dxos/credentials';

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
  private _halo?: HaloParty;
  private _identityKey?: KeyRecord;

  private _deviceKey?: KeyRecord;
  private _deviceKeyChain?: KeyChain;

  public readonly ready = new Event();

  constructor (
    private readonly _keyring: Keyring,
    private readonly _haloFactory: HaloFactory
  ) {}

  get identity () {
    return new Identity(this);
  }

  get keyring () {
    return this._keyring;
  }

  // TODO(burdon): Move to KeyRing?
  get identityKey (): KeyRecord | undefined {
    if (!this._identityKey) {
      this._identityKey = this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY, own: true, trusted: true }));
    }

    return this._identityKey;
  }

  // TODO(burdon): Move to KeyRing?
  get deviceKey (): KeyRecord | undefined {
    if (!this._deviceKey) {
      this._deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE }));
    }

    return this._deviceKey;
  }

  get initialized () {
    return this._halo !== undefined;
  }

  // TODO(burdon): Remove.
  get halo () {
    return this._halo;
  }

  get displayName () {
    return this._halo?.identityInfo?.signed.payload.displayName;
  }

  get identityInfo () {
    return this._halo?.identityInfo;
  }

  get identityGenesis () {
    return this._halo?.identityGenesis;
  }

  get deviceKeyChain () {
    if (!this._deviceKeyChain) {
      const deviceKey = this.deviceKey;
      try {
        this._deviceKeyChain = (this._halo && deviceKey) ? Keyring.buildKeyChain(
          deviceKey.publicKey,
          this._halo.credentialMessages,
          this._halo.feedKeys
        ) : undefined;
      } catch (err) {
        log('Unable to locate device KeyChain:', err); // TODO(burdon): ???
      }
    }

    return this._deviceKeyChain;
  }

  private async _initialize (halo: PartyInternal) {
    assert(this._identityKey, 'No identity key.');
    assert(this._deviceKey, 'No device key.');
    assert(halo.isOpen, 'Halo must be open.');

    this._halo = new HaloParty(halo, this._identityKey.publicKey, this._deviceKey.publicKey);

    // Wait for the minimum set of keys and messages we need for proper function.
    await waitForCondition(() =>
      this._halo!.memberKeys.length &&
      this._halo!.identityGenesis &&
      this.deviceKeyChain
    );

    log('HALO initialized.');
    this.ready.emit();
  }

  @synchronized
  async loadFromStorage () {
    if (this.identityKey) {
      if (this._haloFactory.hasFeedForParty(this.identityKey.publicKey)) {
        // TODO(marik-d): Snapshots for halo party?
        const halo = await this._haloFactory.constructParty(this.identityKey.publicKey);
        // Always open the HALO.
        await halo.open();
        await this._initialize(halo);
      } else if (!this.keyring.hasSecretKey(this.identityKey)) {
        throw new Error('HALO missing and identity key has no secret.');
      }
    }
  }

  /**
   * Creates the Identity HALO.
   */
   @synchronized
  async createHalo (options: HaloCreationOptions = {}): Promise<PartyInternal> {
    assert(!this._halo, 'HALO already exists.');

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
     assert(!this._halo, 'HALO already exists.');
     assert(!this.identityKey, 'Identity key already exists.');

     const halo = await this._haloFactory.recoverHalo(this, seedPhrase);
     await this._initialize(halo);
     return halo;
   }

   /**
    * Joins an existing Identity HALO.
    */
   @synchronized
   async joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
     assert(!this._halo, 'HALO already exists.');

     const halo = await this._haloFactory.joinHalo(invitationDescriptor, secretProvider);
     await this._initialize(halo);
     return halo;
   }
}
