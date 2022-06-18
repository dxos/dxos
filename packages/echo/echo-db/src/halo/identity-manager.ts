//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event, synchronized, waitForCondition } from '@dxos/async';
import { Filter, KeyRecord, Keyring, KeyType, SecretProvider } from '@dxos/credentials';

import { InvitationDescriptor } from '../invitations';
import { MetadataStore } from '../metadata';
import { HaloCreationOptions, HaloFactory } from './halo-factory';
import { HaloParty } from './halo-party';
import { Identity } from './identity';

const log = debug('dxos:echo-db:identity-manager');

/**
 * Manages the keyring and HALO party.
 */
export class IdentityManager {
  private _identity: Identity | undefined;

  public readonly ready = new Event();

  constructor (
    private readonly _keyring: Keyring,
    private readonly _haloFactory: HaloFactory,
    private readonly _metadataStore: MetadataStore
  ) {}

  get identity (): Identity | undefined {
    return this._identity;
  }

  get initialized (): boolean {
    return this._identity !== undefined &&
      !!this._identity.halo &&
      this._identity.halo.isOpen &&
      !!this._identity.halo!.memberKeys.length &&
      !!this._identity.halo!.identityGenesis &&
      !!this._identity.deviceKeyChain;
  }

  private async _initialize (halo: HaloParty) {
    assert(halo.isOpen, 'HALO must be open.');

    this._identity = new Identity(this._keyring, halo);

    // Wait for the minimum set of keys and messages we need for proper function.
    await waitForCondition(() => this.initialized);

    log('HALO initialized.');
    this.ready.emit();
  }

  async close() {
    // const identity = this._identity;
    // this._identity = undefined;
    console.log(typeof this._identity?.halo)
    await this._identity?.halo.close();
  }

  getIdentityKey (): KeyRecord | undefined {
    return this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY, own: true, trusted: true }));
  }

  @synchronized
  async loadFromStorage () {
    const identityKey = this.getIdentityKey();
    if (identityKey) {
      if (this._metadataStore.getParty(identityKey.publicKey)) {
        // TODO(marik-d): Snapshots for halo party?
        const halo = await this._haloFactory.constructParty([]);
        // Always open the HALO.
        await halo.open();
        await this._initialize(halo);
      } else if (!this._keyring.hasSecretKey(identityKey)) {
        throw new Error('HALO missing and identity key has no secret.');
      }
    }
  }

  /**
   * Creates the Identity HALO.
   */
   @synchronized
  async createHalo (options: HaloCreationOptions = {}): Promise<HaloParty> {
    assert(!this._identity, 'Identity already initialized.');

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
     assert(!this._identity, 'Identity already initialized.');

     const halo = await this._haloFactory.recoverHalo(seedPhrase);
     await this._initialize(halo);
     return halo;
   }

   /**
    * Joins an existing Identity HALO.
    */
   @synchronized
   async joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
     assert(!this._identity, 'Identity already initialized.');

     const halo = await this._haloFactory.joinHalo(invitationDescriptor, secretProvider);
     await this._initialize(halo);
     return halo;
   }
}
