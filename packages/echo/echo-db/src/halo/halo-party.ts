//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { Event } from '@dxos/async';
import { KeyHint } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { ObjectModel } from '@dxos/object-model';

import { Item } from '../items';
import { PartyInternal } from '../parties';
import { ResultSet } from '../result';
import { ContactManager } from './contact-manager';
import { Preferences } from './preferences';

export const HALO_PARTY_DESCRIPTOR_TYPE = 'dxn://dxos/item/halo/party-descriptor';
export const HALO_PARTY_CONTACT_LIST_TYPE = 'dxn://dxos/item/halo/contact-list';
export const HALO_PARTY_PREFERENCES_TYPE = 'dxn://dxos/item/halo/preferences';
export const HALO_PARTY_DEVICE_PREFERENCES_TYPE = 'dxn://dxos/item/halo/device/preferences';

/**
 * A record in HALO party representing a party that user is currently a member of.
 */
export interface JoinedParty {
  partyKey: PublicKey,
  keyHints: KeyHint[]
}

/**
 * Wraps PartyInternal and provides all HALO-related functionality.
 */
export class HaloParty {
  private readonly _contactManager: ContactManager;
  private readonly _preferences: Preferences;

  constructor (
    private readonly _party: PartyInternal,
    private readonly _identityKey: PublicKey,
    deviceKey: PublicKey
  ) {
    this._contactManager = new ContactManager(this._party);
    this._preferences = new Preferences(this._party, deviceKey);
  }

  get contacts () {
    return this._contactManager;
  }

  get preferences () {
    return this._preferences;
  }

  // TODO(burdon): Remove.
  get database () {
    return this._party.database;
  }

  //
  // TODO(burdon): Factor out getters into other class abstractions (grouping functionality).
  //   E.g., identity, credentials, device management.
  //

  get invitationManager () {
    return this._party.invitationManager;
  }

  get identityInfo () {
    return this._party.processor.infoMessages.get(this._identityKey.toHex());
  }

  get identityGenesis () {
    return this._party.processor.credentialMessages.get(this._identityKey.toHex());
  }

  get memberKeys () {
    return this._party.processor.memberKeys;
  }

  get credentialMessages () {
    return this._party.processor.credentialMessages;
  }

  get feedKeys () {
    return this._party.processor.feedKeys;
  }

  // TODO(burdon): Life-cycle: this must be in the same class/stack as open (currently IdentityManager).
  async close () {
    await this._party.close();
  }

  //
  // TODO(burdon): Rename and factor out.
  //   What are joined parties? Are these just parties in the HALO (what other kinds exist?)
  //

  async recordPartyJoining (joinedParty: JoinedParty) {
    // TODO(burdon): Is this async?
    const knownParties = await this._party.database.queryItems({ type: HALO_PARTY_DESCRIPTOR_TYPE }).value;
    const partyDesc = knownParties.find(
      partyMarker => joinedParty.partyKey.equals(partyMarker.model.getProperty('publicKey')));
    assert(!partyDesc, `Descriptor already exists for Party: ${joinedParty.partyKey.toHex()}`);

    await this._party.database.createItem({
      model: ObjectModel,
      type: HALO_PARTY_DESCRIPTOR_TYPE,
      props: {
        publicKey: joinedParty.partyKey.asBuffer(),
        subscribed: true,
        hints: joinedParty.keyHints.map(hint => ({ ...hint, publicKey: hint.publicKey?.toHex() }))
      }
    });
  }

  subscribeToJoinedPartyList (callback: (parties: JoinedParty[]) => void): () => void {
    const converter = (partyDesc: Item<any>) => {
      // TODO(burdon): Define type.
      return {
        partyKey: PublicKey.from(partyDesc.model.getProperty('publicKey')),
        keyHints: Object.values(partyDesc.model.getProperty('hints')).map((hint: any) => ({
          ...hint,
          publicKey: PublicKey.from(hint.publicKey)
        } as KeyHint))
      };
    };

    const query = this.database.queryItems({ type: HALO_PARTY_DESCRIPTOR_TYPE });

    // Wrap the query event so we can have manual control.
    const event = new Event();
    query.update.on(() => event.emit());

    const result = new ResultSet<JoinedParty>(event, () => query.value.map(converter));
    const unsubscribe = result.subscribe(callback);
    if (result.value.length) {
      event.emit();
    }

    return unsubscribe;
  }
}
