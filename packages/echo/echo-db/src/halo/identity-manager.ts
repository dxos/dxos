//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event, synchronized, waitForCondition } from '@dxos/async';
import { Filter, KeyRecord, Keyring, KeyType, SecretProvider } from '@dxos/credentials';
import { failUndefined } from '@dxos/debug';

import { InvitationDescriptor } from '../invitations';
import { MetadataStore } from '../pipeline';
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

  private async _initialize (halo: HaloParty) {
    assert(halo.isOpen, 'HALO must be open.');

    // Wait for the minimum set of keys and messages we need for proper function:
    //
    // - KeyAdmit message for the current device so we can build the device KeyChain.
    // - Identity genesis so it can be copied into newly joined parties.
    //
    const deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })) ?? failUndefined();
    await waitForCondition(() =>
      halo.processor.isMemberKey(deviceKey.publicKey) &&
      halo.identityGenesis
    );

    this._identity = new Identity(this._keyring, halo);
    this.ready.emit();
    log('HALO initialized.');
  }

  async close () {
    const identity = this._identity;
    this._identity = undefined;

    await identity?.halo.close();
  }

  getIdentityKey (): KeyRecord | undefined {
    return this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY, own: true, trusted: true }));
  }

  @synchronized
  async loadFromStorage () {
    const identityKey = this.getIdentityKey();
    if (identityKey) {
      const metadata = this._metadataStore.getParty(identityKey.publicKey);
      if (metadata) {
        // TODO(marik-d): Snapshots for halo party?
        const halo = await this._haloFactory.constructParty();

        assert(metadata.genesisFeedKey);
        halo._setGenesisFeedKey(metadata.genesisFeedKey);

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

    const identityKey = this.getIdentityKey() ?? failUndefined();
    this._metadataStore.setGenesisFeed(identityKey.publicKey, await halo.getWriteFeedKey())

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
