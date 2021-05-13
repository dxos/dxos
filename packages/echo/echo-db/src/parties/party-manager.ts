//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import debug from 'debug';
import unionWith from 'lodash/unionWith';

import { Event, synchronized } from '@dxos/async';
import { KeyHint, KeyType } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { timed } from '@dxos/debug';
import { PartyKey } from '@dxos/echo-protocol';
import { ComplexMap } from '@dxos/util';

import { SecretProvider, InvitationDescriptor } from '../invitations';
import { SnapshotStore } from '../snapshots';
import { FeedStoreAdapter } from '../util';
import { IdentityManager } from './identity-manager';
import { HaloCreationOptions, PartyFactory } from './party-factory';
import { PartyInternal, PARTY_ITEM_TYPE, PARTY_TITLE_PROPERTY } from './party-internal';

const CONTACT_DEBOUNCE_INTERVAL = 500;

const log = debug('dxos:echo:parties:party-manager');

export interface OpenProgress {
  haloOpened: boolean;
  partiesOpened?: number;
  totalParties?: number;
}

/**
 * Manages the life-cycle of parties.
 */
export class PartyManager {
  // Has the PartyManager been opened.
  private _opened = false;

  // Map of parties by party key.
  private readonly _parties = new ComplexMap<PublicKey, PartyInternal>(key => key.toHex());

  // External event listener.
  // TODO(burdon): Wrap with subscribe.
  readonly update = new Event<PartyInternal>();

  private readonly _subscriptions: (() => void)[] = [];

  constructor (
    private readonly _identityManager: IdentityManager,
    private readonly _feedStore: FeedStoreAdapter,
    private readonly _snapshotStore: SnapshotStore,
    private readonly _partyFactory: PartyFactory
  ) {}

  get identityManager () {
    return this._identityManager;
  }

  get parties (): PartyInternal[] {
    return Array.from(this._parties.values());
  }

  // TODO(burdon): Rename isOpen.
  // @deprecated
  get opened () {
    return this._opened;
  }

  @synchronized
  @timed(6000)
  async open (onProgressCallback?: (progress: OpenProgress) => void) {
    if (this._opened) {
      return;
    }
    onProgressCallback?.({ haloOpened: false });

    await this._feedStore.open();

    // Open the HALO first (if present).
    if (this._identityManager.identityKey) {
      if (this._feedStore.queryWritableFeed(this._identityManager.identityKey.publicKey)) {
        // TODO(marik-d): Snapshots for halo party?
        const halo = await this._partyFactory.constructParty(this._identityManager.identityKey.publicKey);
        // Always open the HALO.
        await halo.open();
        await this._setHalo(halo);
      } else if (!this.identityManager.keyring.hasSecretKey(this.identityManager.identityKey!)) {
        throw new Error('HALO missing and Identity key has no secret.');
      }
    }

    onProgressCallback?.({ haloOpened: true });

    // TODO(telackey): Does it make any sense to load other parties if we don't have an HALO?

    // Iterate descriptors and pre-create Party objects.
    const nonHaloParties = this._feedStore.getPartyKeys().filter(partyKey => !this._isHalo(partyKey));
    const uniqueNonHaloParties = unionWith(nonHaloParties, PublicKey.equals); // Parties can be duplicated when there is more than 1 device

    onProgressCallback?.({ haloOpened: true, totalParties: uniqueNonHaloParties.length, partiesOpened: 0 });

    for (let i = 0; i < uniqueNonHaloParties.length; i++) {
      const partyKey = uniqueNonHaloParties[i];
      if (!this._parties.has(partyKey)) {
        const snapshot = await this._snapshotStore.load(partyKey);
        const party = snapshot
          ? await this._partyFactory.constructPartyFromSnapshot(snapshot)
          : await this._partyFactory.constructParty(partyKey);

        const isActive = this._identityManager.halo?.isActive(partyKey) ?? true;
        if (isActive) {
          await party.open();
          // TODO(marik-d): Might not be required if separately snapshot this item.
          await party.database.waitForItem({ type: PARTY_ITEM_TYPE });
        }

        this._setParty(party);
        onProgressCallback?.({ haloOpened: true, totalParties: uniqueNonHaloParties.length, partiesOpened: i + 1 });
      }
    }

    this._opened = true;
  }

  @synchronized
  @timed(6000)
  async close () {
    this._opened = false;

    // Flush callbacks.
    this._subscriptions.forEach(cb => cb());

    // Close parties.
    for (const party of this._parties.values()) {
      if (party.isOpen) {
        await party.close();
      }
    }

    await this._identityManager.halo?.close();
    await this._feedStore.close();

    this._parties.clear();
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
    assert(this._opened, 'PartyManager is not open.');
    assert(!this._identityManager.halo, 'HALO already exists.');
    assert(!this._identityManager.identityKey, 'Identity key already exists.');

    const halo = await this._partyFactory.recoverHalo(seedPhrase);
    await this._setHalo(halo);

    return halo;
  }

  /**
   * Joins an existing Identity HALO.
   */
  @synchronized
  async joinHalo (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(this._opened, 'PartyManager is not open.');
    assert(!this._identityManager.halo, 'HALO already exists.');

    const halo = await this._partyFactory.joinHalo(invitationDescriptor, secretProvider);
    await this._setHalo(halo);

    return halo;
  }

  /**
   * Creates the Identity HALO.
   */
  @synchronized
  async createHalo (options: HaloCreationOptions = {}): Promise<PartyInternal> {
    assert(this._opened, 'PartyManager is not open.');
    assert(!this._identityManager.halo, 'HALO already exists.');

    const halo = await this._partyFactory.createHalo(options);
    await this._setHalo(halo);

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
    assert(!this._parties.has(party.key), 'Party already exists.');

    this._setParty(party);
    await this._recordPartyJoining(party);
    await this._updateContactList(party);

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

    // The caller should have checked if the Party existed before calling addParty, but that check
    // is not within a single critical section, and so things may have changed. So we must perform that
    // check again, here within the synchronized block.
    if (this._parties.has(partyKey)) {
      log(`Already had party partyKey=${partyKey.toHex()}`);
      return this._parties.get(partyKey);
    }

    log(`Adding party partyKey=${partyKey.toHex()} hints=${hints.length}`);
    const party = await this._partyFactory.addParty(partyKey, hints);
    this._setParty(party);

    return party;
  }

  @synchronized
  async joinParty (invitationDescriptor: InvitationDescriptor, secretProvider: SecretProvider) {
    assert(this._opened, 'PartyManager is not open.');
    assert(this._identityManager.initialized, 'IdentityManager has not been initialized with the HALO.');

    // TODO(marik-d): Somehow check that we don't already have this party
    // TODO(telackey): ^^ We can check the PartyKey during the greeting flow.
    const party = await this._partyFactory.joinParty(invitationDescriptor, secretProvider);
    await party.database.waitForItem({ type: PARTY_ITEM_TYPE });

    // TODO(telackey): This is wrong, as we'll just open both writable feeds of it next time causing confusion.
    if (this._parties.has(party.key)) {
      await party.close();
      throw new Error(`Party already exists ${party.key.toHex()}`); // TODO(marik-d): Handle this gracefully
    }

    this._setParty(party);
    await this._recordPartyJoining(party);
    await this._updateContactList(party);

    return party;
  }

  // Only call from a @synchronized method.
  private async _setHalo (halo: PartyInternal) {
    await this._identityManager.initialize(halo);

    this._subscriptions.push(this._identityManager.halo!.subscribeToJoinedPartyList(async values => {
      if (!this._opened) {
        return;
      }

      for (const partyDesc of values) {
        if (!this._parties.has(partyDesc.partyKey)) {
          log(`Auto-opening new Party from HALO: ${partyDesc.partyKey.toHex()}`);
          await this.addParty(partyDesc.partyKey, partyDesc.keyHints);
        }
      }
    }));

    this._subscriptions.push(this._identityManager.halo!.subscribeToPreferences(async () => {
      for (const party of this._parties.values()) {
        const shouldBeOpen = this._identityManager.halo?.isActive(party.key);
        if (party.isOpen && !shouldBeOpen) {
          log(`Auto-closing deactivated party ${party.key.toHex()}`);

          await party.close();
          this.update.emit(party);
        } else if (!party.isOpen && shouldBeOpen) {
          log(`Auto-opening activated party ${party.key.toHex()}`);

          await party.open();
          this.update.emit(party);
        }
      }
    }));
  }

  private _setParty (party: PartyInternal) {
    const contactUpdater = async () => {
      try {
        await this._updateContactList(party);
      } catch (e) {
        log('Error updating contact list:', e);
      }
    };

    const titleUpdater = async () => {
      try {
        await this._updatePartyTitle(party);
      } catch (e) {
        log('Error updating stored Party title:', e);
      }
    };

    const attachUpdateListeners = () => {
      const debouncedContacts = party.processor.keyOrInfoAdded.debounce(CONTACT_DEBOUNCE_INTERVAL).discardParameter();
      debouncedContacts.on(contactUpdater);
      party.database.queryItems({ type: PARTY_ITEM_TYPE }).update.on(titleUpdater);
    };

    if (party.isOpen) {
      attachUpdateListeners();
    } else {
      party.update.waitFor(() => {
        if (party.isOpen) {
          attachUpdateListeners();
          return true;
        }
        return false;
      });
    }

    this._parties.set(party.key, party);
    this.update.emit(party);
  }

  private async _updatePartyTitle (party: PartyInternal) {
    if (!this._opened) {
      return;
    }

    const item = await party.getPropertiesItem();
    const currentTitle = item.model.getProperty(PARTY_TITLE_PROPERTY);

    const storedTitle = this.identityManager.halo?.getGlobalPartyPreference(party.key, PARTY_TITLE_PROPERTY);
    if (storedTitle !== currentTitle) {
      log(`Updating stored name from ${storedTitle} to ${currentTitle} for Party ${party.key.toHex()}`);
      await this.identityManager.halo?.setGlobalPartyPreference(party, PARTY_TITLE_PROPERTY, currentTitle);
    }
  }

  private async _updateContactList (party: PartyInternal) {
    // Prevent any updates after we closed ECHO.
    // This will get re-run next time echo is loaded so we don't loose any data.
    if (!this._opened) {
      return;
    }

    const contactListItem = this._identityManager.halo?.getContactListItem();
    if (!contactListItem) {
      return;
    }

    const contactList = contactListItem.model.toObject() as any;

    for (const publicKey of party.processor.memberKeys) {
      // A key that represents either us or the Party itself is never a contact.
      if (this._identityManager?.identityKey?.publicKey.equals(publicKey) || party.key.equals(publicKey)) {
        continue;
      }

      const hexKey = publicKey.toHex();
      const contact = contactList[hexKey];
      const memberInfo = party.processor.getMemberInfo(publicKey);

      if (contact) {
        if (memberInfo && contact.displayName !== memberInfo.displayName) {
          log(`Updating contact ${hexKey} to ${memberInfo.displayName}`);
          contact.displayName = memberInfo.displayName;
          await contactListItem.model.setProperty(hexKey, memberInfo);
        }
      } else {
        const displayName = memberInfo?.displayName ?? hexKey;
        log(`Creating contact ${hexKey} to ${displayName}`);
        await contactListItem.model.setProperty(hexKey, { publicKey, displayName });
      }
    }
  }

  private _isHalo (partyKey: PublicKey) {
    assert(this._identityManager.identityKey, 'No identity key');
    return partyKey.equals(this._identityManager.identityKey.publicKey);
  }

  @timed(5000)
  private async _recordPartyJoining (party: PartyInternal) {
    assert(this._identityManager.halo, 'HALO is required.');

    const keyHints: KeyHint[] = [
      ...party.processor.memberKeys.map(publicKey => ({ publicKey: publicKey, type: KeyType.UNKNOWN })),
      ...party.processor.feedKeys.map(publicKey => ({ publicKey: publicKey, type: KeyType.FEED }))
    ];

    await this._identityManager.halo.recordPartyJoining({
      partyKey: party.key,
      keyHints
    });
  }
}
