//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event, synchronized } from '@dxos/async';
import { KeyHint } from '@dxos/credentials';
import { keyToString } from '@dxos/crypto';
import { PartyKey, PublicKey } from '@dxos/echo-protocol';
import { ComplexMap } from '@dxos/util';

import { FeedStoreAdapter } from '../feed-store-adapter';
import { SecretProvider } from '../invitations/common';
import { InvitationDescriptor } from '../invitations/invitation-descriptor';
import { IdentityManager } from './identity-manager';
import { HaloCreationOptions, PartyFactory } from './party-factory';
import { PartyInternal } from './party-internal';

const log = debug('dxos:echo:party-manager');

/**
 * Manages the life-cycle of parties.
 */
export class PartyManager {
  // Has the PartyManager been opened.
  private _opened = false;

  // Map of parties by party key.
  private readonly _parties = new ComplexMap<PublicKey, PartyInternal>(keyToString);

  // External event listener.
  // TODO(burdon): Wrap with subscribe.
  readonly update = new Event<PartyInternal>();

  constructor (
    private readonly _identityManager: IdentityManager,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _partyFactory: PartyFactory
  ) { }

  get parties (): PartyInternal[] {
    return Array.from(this._parties.values());
  }

  get opened () {
    return this._opened;
  }

  @synchronized
  async open () {
    if (this._opened) return;
    await this._feedStore.open();

    // Open the HALO first (if present).
    if (this._identityManager.identityKey) {
      if (this._feedStore.queryWritableFeed(this._identityManager.identityKey.publicKey)) {
        const halo = await this._partyFactory.constructParty(this._identityManager.identityKey.publicKey);
        // Always open the HALO.
        await halo.open();
        await this._identityManager.initialize(halo);
      }
    }

    // Iterate descriptors and pre-create Party objects.
    for (const partyKey of this._feedStore.getPartyKeys()) {
      if (!this._parties.has(partyKey) && !this._isHalo(partyKey)) {
        const party = await this._partyFactory.constructParty(partyKey);
        // TODO(telackey): Should parties be auto-opened?
        await party.open();
        this._parties.set(party.key, party);
        this.update.emit(party);
      }
    }

    this._opened = true;
  }

  @synchronized
  async close () {
    await this._feedStore.close();
    this._opened = false;
  }

  /**
   * Creates a new party, writing its genesis block to the stream.
   */
  @synchronized
  async createHalo (options: HaloCreationOptions = {}): Promise<PartyInternal> {
    assert(this._opened, 'PartyManager is not open.');
    assert(!this._identityManager.halo, 'HALO already exists.');

    const halo = await this._partyFactory.createHalo(options);
    await this._identityManager.initialize(halo);
    return halo;
  }

  /**
   * Creates a new party, writing its genesis block to the stream.
   */
  @synchronized
  async createParty (): Promise<PartyInternal> {
    assert(this._opened, 'PartyManager is not open.');
    assert(this._identityManager.initialized, 'IdentityManager has not been initialized with the HALO.');

    const party = await this._partyFactory.createParty();

    if (this._parties.has(party.key)) {
      await party.close();
      throw new Error(`Party already exists ${keyToString(party.key)}`); // TODO(marik-d): Handle this gracefully
    }
    this._parties.set(party.key, party);
    this.update.emit(party);
    return party;
  }

  /**
   * Construct a party object and start replicating with the remote peer that created that party.
   * @param partyKey
   * @param hints
   */
  // TODO(telackey): Remove 'feeds' since should not be listed here. The set of trusted feeds is the
  // under the authority of the PartyStateMachine.
  @synchronized
  async addParty (partyKey: PartyKey, hints: KeyHint[] = []) {
    assert(this._opened, 'PartyManager is not open.');
    assert(this._identityManager.initialized, 'IdentityManager has not been initialized with the HALO.');

    log(`Adding party partyKey=${keyToString(partyKey)} hints=${hints.length}`);
    assert(!this._parties.has(partyKey));
    const party = await this._partyFactory.addParty(partyKey, hints);

    if (this._parties.has(party.key)) {
      await party.close();
      throw new Error(`Party already exists ${keyToString(party.key)}`); // TODO(marik-d): Handle this gracefully
    }
    this._parties.set(party.key, party);
    this.update.emit(party);
  }

  @synchronized
  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(this._opened, 'PartyManager is not open.');
    assert(this._identityManager.initialized, 'IdentityManager has not been initialized with the HALO.');

    // TODO(marik-d): Somehow check that we don't already have this party
    const party = await this._partyFactory.joinParty(invitationDescriptor, secretProvider);

    if (this._parties.has(party.key)) {
      await party.close();
      throw new Error(`Party already exists ${keyToString(party.key)}`); // TODO(marik-d): Handle this gracefully
    }
    this._parties.set(party.key, party);
    this.update.emit(party);
    return party;
  }

  private _isHalo (partyKey: PublicKey) {
    return Buffer.compare(partyKey, this._identityManager.identityKey.publicKey) === 0;
  }
}
