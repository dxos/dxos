//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';

import { Event, Lock } from '@dxos/async';
import { keyToString } from '@dxos/crypto';
import { FeedKey, PartyKey, PublicKey } from '@dxos/experimental-echo-protocol';
import { ComplexMap } from '@dxos/experimental-util';

import { FeedStoreAdapter } from '../feed-store-adapter';
import { SecretProvider } from '../invitations/common';
import { InvitationDescriptor } from '../invitations/invitation-descriptor';
import { IdentityManager } from './identity-manager';
import { Party } from './party';
import { PartyFactory } from './party-factory';

const log = debug('dxos:echo:party-manager');

/**
 * Manages the life-cycle of parties.
 */
export class PartyManager {
  // Has the PartyManager been opened.
  private _opened = false;

  // Map of parties by party key.
  private readonly _parties = new ComplexMap<PublicKey, Party>(keyToString);

  private readonly _lock = new Lock();

  // External event listener.
  // TODO(burdon): Wrap with subscribe.
  readonly update = new Event<Party>();

  constructor (
    private readonly _identityManager: IdentityManager,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _partyFactory: PartyFactory
  ) { }

  get parties (): Party[] {
    return Array.from(this._parties.values());
  }

  get opened () {
    return this._opened;
  }

  async open () {
    return this._lock.executeSynchronized(async () => {
      await this._feedStore.open();

      // Open the HALO first (if present).
      if (this._feedStore.queryWritableFeed(this._identityManager.identityKey.publicKey)) {
        const { party: halo } = await this._partyFactory.constructParty(this._identityManager.identityKey.publicKey);
        await this._identityManager.initialize(halo);
      }

      // Iterate descriptors and pre-create Party objects.
      for await (const partyKey of this._feedStore.getPartyKeys()) {
        if (!this._parties.has(partyKey) && !this._isHalo(partyKey)) {
          const { party } = await this._partyFactory.constructParty(partyKey);
          this._parties.set(party.key, party);
          this.update.emit(party);
        }
      }

      this._opened = true;
    });
  }

  async close () {
    return this._lock.executeSynchronized(async () => {
      await this._feedStore.close();
      this._opened = false;
    });
  }

  /**
   * Creates a new party, writing its genesis block to the stream.
   */
  async createHalo (): Promise<Party> {
    assert(this._opened, 'PartyManager is not open.');
    assert(!this._identityManager.halo, 'HALO already exists.');

    return this._lock.executeSynchronized(async () => {
      const halo = await this._partyFactory.createHalo();
      await this._identityManager.initialize(halo);
      return halo;
    });
  }

  /**
   * Creates a new party, writing its genesis block to the stream.
   */
  async createParty (): Promise<Party> {
    assert(this._opened, 'PartyManager is not open.');
    assert(this._identityManager.initialized, 'IdentityManager has not been initialized with the HALO.');

    return this._lock.executeSynchronized(async () => {
      const party = await this._partyFactory.createParty();
      this._parties.set(party.key, party);
      this.update.emit(party);
      return party;
    });
  }

  /**
   * Construct a party object and start replicating with the remote peer that created that party.
   * @param partyKey
   * @param feeds Set of feeds belonging to that party
   */
  // TODO(telackey): Remove 'feeds' since should not be listed here. The set of trusted feeds is the
  // under the authority of the PartyStateMachine.
  async addParty (partyKey: PartyKey, feeds: FeedKey[] = []) {
    assert(this._opened, 'PartyManager is not open.');
    assert(this._identityManager.initialized, 'IdentityManager has not been initialized with the HALO.');

    return this._lock.executeSynchronized(async () => {
      log(`Adding party partyKey=${keyToString(partyKey)} feeds=${feeds.map(keyToString)}`);
      assert(!this._parties.has(partyKey));
      const { party } = await this._partyFactory.addParty(partyKey, feeds);
      this._parties.set(party.key, party);
      this.update.emit(party);
    });
  }

  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(this._opened, 'PartyManager is not open.');
    assert(this._identityManager.initialized, 'IdentityManager has not been initialized with the HALO.');

    return this._lock.executeSynchronized(async () => {
      const party = await this._partyFactory.joinParty(invitationDescriptor, secretProvider);
      this._parties.set(party.key, party);
      this.update.emit(party);
      return party;
    });
  }

  private _isHalo (partyKey: PublicKey) {
    return Buffer.compare(partyKey, this._identityManager.identityKey.publicKey) === 0;
  }
}
