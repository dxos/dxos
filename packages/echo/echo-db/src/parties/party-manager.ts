//
// Copyright 2020 DXOS.org
//

import debug from 'debug';
import unionWith from 'lodash.unionwith';
import assert from 'node:assert';

import { Event, synchronized } from '@dxos/async';
import { SecretProvider } from '@dxos/credentials';
import { failUndefined, timed } from '@dxos/debug';
import { PartyKey } from '@dxos/echo-protocol';
import { PublicKey } from '@dxos/protocols';
import { PartySnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { ComplexMap, boolGuard, Provider } from '@dxos/util';

import { InvitationDescriptorWrapper } from '../invitations';
import { MetadataStore } from '../pipeline';
import { IdentityCredentials } from '../protocol/identity-credentials';
import { SnapshotStore } from '../snapshots';
import { DataParty, PARTY_ITEM_TYPE, PARTY_TITLE_PROPERTY } from './data-party';
import { PartyFactory } from './party-factory';

export const CONTACT_DEBOUNCE_INTERVAL = 500;

const log = debug('dxos:echo-db:party-manager');

export interface OpenProgress {
  haloOpened: boolean
  partiesOpened?: number
  totalParties?: number
}

/**
 * Top-level class manages the complete life-cycle of parties.
 *
 * `ECHO` => `PartyManager` => `DataParty` => `PartyCore`
 */
export class PartyManager {
  // External event listener.
  readonly update = new Event<DataParty>();

  // Map of parties by party key.
  private readonly _parties = new ComplexMap<PublicKey, DataParty>(key => key.toHex());

  private _open = false;

  constructor (
    private readonly _metadataStore: MetadataStore,
    private readonly _snapshotStore: SnapshotStore,
    private readonly _identityProvider: Provider<IdentityCredentials | undefined>,
    private readonly _partyFactory: PartyFactory
  ) {}

  get isOpen () {
    return this._open;
  }

  get parties (): DataParty[] {
    return Array.from(this._parties.values());
  }

  @synchronized
  @timed(6_000) // TODO(burdon): Why not 5000?
  // TODO(burdon): Replace callback with event.
  async open (onProgressCallback?: (progress: OpenProgress) => void) {
    if (this._open) {
      return;
    }
    this._open = true;

    let partyKeys = this._metadataStore.parties.map(party => party.key).filter(boolGuard);

    // Identity may be undefined, for example, on the first start.
    const identity = this._identityProvider();

    // TODO(telackey): Does it make any sense to load other parties if we don't have an HALO?
    if (identity) {
      partyKeys = partyKeys.filter(partyKey => !partyKey.equals(identity.identityKey!.publicKey));
    }

    // TODO(burdon): Does this make sense?
    // Parties may be duplicated when there is more than one device.
    partyKeys = unionWith<PublicKey>(partyKeys, PublicKey.equals);

    onProgressCallback?.({ haloOpened: true, totalParties: partyKeys.length, partiesOpened: 0 });

    // Open active parties.
    // TODO(burdon): Make async?
    for (let i = 0; i < partyKeys.length; i++) {
      const partyKey = partyKeys[i];
      if (!this._parties.has(partyKey)) {
        const snapshot = await this._snapshotStore.load(partyKey);

        const metadata = this._metadataStore.getParty(partyKey) ?? failUndefined();
        if (!metadata.genesisFeedKey) {
          log(`Skipping loading party with missing genesis feed key: ${partyKey}`);
          continue;
        }

        const party = snapshot
          ? await this._partyFactory.constructPartyFromSnapshot(snapshot)
          : await this._partyFactory.constructParty(partyKey);
        party._setGenesisFeedKey(metadata.genesisFeedKey);

        const isActive = identity?.preferences?.isPartyActive(partyKey) ?? true;
        if (isActive) {
          await party.open();
          // TODO(marik-d): Might not be required if separately snapshot this item.
          await party.database.waitForItem({ type: PARTY_ITEM_TYPE });
        }

        this._setParty(party);

        onProgressCallback?.({ haloOpened: true, totalParties: partyKeys.length, partiesOpened: i + 1 });
      }
    }
  }

  @synchronized
  @timed(6_000)
  // TODO(burdon): Can this be re-opened?
  async close () {
    if (!this._open) {
      return;
    }
    this._open = false;

    // Close parties.
    for (const party of this._parties.values()) {
      if (party.isOpen) {
        await party.close();
      }
    }

    this._parties.clear();
  }

  //
  // Party.
  //

  /**
   * Creates a new party, writing its genesis block to the stream.
   */
  @synchronized
  async createParty (): Promise<DataParty> {
    assert(this._open, 'PartyManager is not open.');

    const party = await this._partyFactory.createParty();
    assert(!this._parties.has(party.key), 'Party already exists.');

    this._setParty(party);
    await this._recordPartyJoining(party);
    await this._updateContactList(party);
    await this._metadataStore.addParty(party.key);
    return party;
  }

  /**
   * Construct a party object and start replicating with the remote peer that created that party.
   */
  @synchronized
  async addParty (partyKey: PartyKey, genesisFeedKey: PublicKey) {
    assert(this._open, 'PartyManager is not open.');

    /*
     * The caller should have checked if the Party existed before calling addParty, but that check
     * is not within a single critical section, and so things may have changed. So we must perform that
     * check again, here within the synchronized block.
     */
    if (this._parties.has(partyKey)) {
      log(`Already had party partyKey=${partyKey.toHex()}`);
      return this._parties.get(partyKey);
    }

    log(`Adding party partyKey=${partyKey.toHex()}`);
    const party = await this._partyFactory.constructParty(partyKey);
    party._setGenesisFeedKey(genesisFeedKey);

    await this._metadataStore.addParty(party.key);
    await this._metadataStore.setGenesisFeed(party.key, genesisFeedKey);

    await party.open();
    this._setParty(party);
    return party;
  }

  @synchronized
  async joinParty (invitationDescriptor: InvitationDescriptorWrapper, secretProvider: SecretProvider) {
    assert(this._open, 'PartyManager is not open.');

    // TODO(marik-d): Somehow check that we don't already have this party.
    // TODO(telackey): We can check the PartyKey during the greeting flow.
    const party = await this._partyFactory.joinParty(invitationDescriptor, secretProvider);
    await party.database.waitForItem({ type: PARTY_ITEM_TYPE });

    // TODO(telackey): This is wrong, as we'll just open both writable feeds of it next time causing confusion.
    if (this._parties.has(party.key)) {
      await party.close();
      // TODO(marik-d): Handle this gracefully.
      throw new Error(`Party already exists ${party.key.toHex()}`);
    }

    this._setParty(party);
    await this._recordPartyJoining(party);
    await this._updateContactList(party);
    return party;
  }

  @synchronized
  async cloneParty (snapshot: PartySnapshot) {
    assert(this._open, 'PartyManager is not open.');

    // TODO(marik-d): Somehow check that we don't already have this party.
    // TODO(telackey): We can check the PartyKey during the greeting flow.
    const party = await this._partyFactory.cloneParty(snapshot);
    await party.database.waitForItem({ type: PARTY_ITEM_TYPE });

    // TODO(telackey): This is wrong, as we'll just open both writable feeds of it next time causing confusion.
    if (this._parties.has(party.key)) {
      await party.close();
      // TODO(marik-d): Handle this gracefully.
      throw new Error(`Party already exists ${party.key.toHex()}`);
    }

    this._setParty(party);
    await this._recordPartyJoining(party);
    await this._updateContactList(party);
    return party;
  }

  private _setParty (party: DataParty) {
    const updateContact = async () => {
      try {
        await this._updateContactList(party);
      } catch (err: any) {
        log('Error updating contact list:', err);
      }
    };

    const updateTitle = async () => {
      try {
        await this._updatePartyTitle(party);
      } catch (err: any) {
        log('Error updating stored Party title:', err);
      }
    };

    const attachUpdateListeners = () => {
      const debouncedContacts = party.processor.keyOrInfoAdded.debounce(CONTACT_DEBOUNCE_INTERVAL).discardParameter();
      debouncedContacts.on(updateContact);
      party.database.select({ type: PARTY_ITEM_TYPE }).exec().update.on(updateTitle);
    };

    if (party.isOpen) {
      attachUpdateListeners();
    } else {
      void party.update.waitFor(() => party.isOpen).then(() => attachUpdateListeners());
    }

    this._parties.set(party.key, party);
    this.update.emit(party);
  }

  // TODO(burdon): Refactor.
  private async _updatePartyTitle (party: DataParty) {
    if (!this._open) {
      return;
    }

    const identity = this._identityProvider();
    const item = await party.getPropertiesItem();
    const currentTitle = item.model.get(PARTY_TITLE_PROPERTY);
    const storedTitle = identity?.preferences?.getGlobalPartyPreference(party.key, PARTY_TITLE_PROPERTY);
    if (storedTitle !== currentTitle) {
      await identity?.preferences?.setGlobalPartyPreference(party, PARTY_TITLE_PROPERTY, currentTitle);
    }
  }

  // TODO(burdon): Reconcile with `Halo.ContactManager`.
  private async _updateContactList (party: DataParty) {
    // Prevent any updates after we closed ECHO.
    // This will get re-run next time echo is loaded so we don't loose any data.
    if (!this._open) {
      return;
    }

    const identity = this._identityProvider();

    const contactListItem = identity?.contacts?.getContactListItem();
    if (!contactListItem) {
      return;
    }

    const contactList = contactListItem.model.toObject() as any;

    for (const publicKey of party.processor.memberKeys) {
      // A key that represents either us or the Party itself is never a contact.
      if (identity?.identityKey?.publicKey.equals(publicKey) || party.key.equals(publicKey)) {
        continue;
      }

      const hexKey = publicKey.toHex();
      const contact = contactList[hexKey];
      const memberInfo = party.processor.getMemberInfo(publicKey);

      if (contact) {
        if (memberInfo && contact.displayName !== memberInfo.displayName) {
          log(`Updating contact ${hexKey} to ${memberInfo.displayName}`);
          contact.displayName = memberInfo.displayName;
          await contactListItem.model.set(hexKey, memberInfo);
        }
      } else {
        const displayName = memberInfo?.displayName ?? hexKey;
        log(`Creating contact ${hexKey} to ${displayName}`);
        await contactListItem.model.set(hexKey, { publicKey, displayName });
      }
    }
  }

  @timed(5_000)
  private async _recordPartyJoining (party: DataParty) {
    const identity = this._identityProvider();

    // TODO(marik-d): Extract HALO functionality from this class.
    if (!identity?.preferences) {
      return;
    }

    await identity.preferences.recordPartyJoining({
      partyKey: party.key,
      genesisFeed: party.genesisFeedKey
    });
  }
}
