//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';

import { Event, synchronized, waitForCondition } from '@dxos/async';
import { Filter, KeyRecord, Keyring, KeyType, SecretProvider } from '@dxos/credentials';
import { failUndefined, todo } from '@dxos/debug';

import { InvitationDescriptor } from '../invitations';
import { MetadataStore } from '../pipeline';
import { HaloCreationOptions, HaloFactory } from './halo-factory';
import { HaloParty } from './halo-party';
import { Identity } from './identity';
import { getCredentialAssertion, IdentityRecord } from '@dxos/halo-protocol';

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

  private async _initialize (identityRecord: IdentityRecord, halo: HaloParty) {
    assert(halo.isOpen, 'HALO must be open.');

    // TODO(dmaretskyi): Wait for the device credentials to be processed.
    // Wait for the minimum set of keys and messages we need for proper function:
    // - KeyAdmit message for the current device so we can build the device KeyChain.
    // - Identity genesis so it can be copied into newly joined parties.
    // const deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })) ?? failUndefined();
    // await waitForCondition(() => halo.identityGenesis);

    // TODO(dmaretskyi): Extract to HaloParty.
    const identityKey = this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY, own: true, trusted: true })) ?? failUndefined();
    const deviceKey = this._keyring.findKey(Keyring.signingFilter({ type: KeyType.DEVICE })) ?? failUndefined();

    // Wait for the AuthorizedDevice credential for the current device to be processed. 
    await halo.processor.credentialProcessed.waitForCondition(() => halo.isOpen && halo.processor.credentialMessages.some(credential => {
      const assertion = getCredentialAssertion(credential);
      return credential.issuer.equals(identityKey.publicKey) &&
        credential.subject.id.equals(deviceKey.publicKey) &&
        assertion['@type'] === 'dxos.halo.credentials.AuthorizedDevice'
    }));

    this._identity = new Identity(identityRecord, this._keyring, halo);
    this.ready.emit();
    log('HALO initialized.');
  }

  async close () {
    const identity = this._identity;
    this._identity = undefined;

    await identity?.halo.close();
  }

  // TODO(dmaretskyi): Query using the public key from metadata.
  getIdentityKey (): KeyRecord | undefined {
    return this._keyring.findKey(Filter.matches({ type: KeyType.IDENTITY, own: true, trusted: true }));
  }

  @synchronized
  async loadFromStorage () {
    const identityRecord = this._metadataStore.getIdentityRecord()
    if (identityRecord) {
      const identityKey = this.getIdentityKey() ?? failUndefined();
      assert(identityKey.publicKey.equals(identityRecord.identityKey))
      // TODO(marik-d): Snapshots for halo party?
      const halo = await this._haloFactory.constructParty(identityRecord.haloSpace.spaceKey);
      halo._setGenesisFeedKey(identityRecord.haloSpace.genesisFeedKey);

      // Always open the HALO.
      await halo.open();
      await this._initialize(identityRecord, halo);
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
    const identityRecord: IdentityRecord = {
       identityKey: identityKey.publicKey,
       haloSpace: {
         spaceKey: halo.key,
         genesisFeedKey: await halo.getWriteFeedKey(),
       }
     };
    await this._metadataStore.setIdentityRecord(identityRecord)

    await this._initialize(identityRecord, halo);
    return halo;
  }

    /**
     * Initializes the current agent as a new device with the provided identity.
     * 
     * Expects the device key to exist in the keyring.
     * Expects the new device to be admitted to the HALO.
     */
    async manuallyJoin(identity: IdentityRecord) {
      // Import identity key.
      await this._keyring.addPublicKey({ type: KeyType.IDENTITY, publicKey: identity.identityKey, own: true, trusted: true });
      
      const halo = await this._haloFactory.constructParty(identity.haloSpace.spaceKey);
      halo._setGenesisFeedKey(identity.haloSpace.genesisFeedKey);
      await this._metadataStore.setIdentityRecord(identity)

      await halo.open();

      await this._initialize(identity, halo);
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
     await this._initialize(todo(), halo);
     return halo;
   }

   /**
    * Joins an existing Identity HALO.
    */
   @synchronized
   async joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
     assert(!this._identity, 'Identity already initialized.');

     const halo = await this._haloFactory.joinHalo(invitationDescriptor, secretProvider);
     await this._initialize(todo(), halo);
     return halo;
   }
}
