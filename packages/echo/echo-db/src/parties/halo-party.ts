//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import stableStringify from 'json-stable-stringify';
import defaultsDeep from 'lodash/defaultsDeep';

import { Event } from '@dxos/async';
import { KeyHint } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';
import { ObjectModel } from '@dxos/object-model';

import { Item } from '../items';
import { ResultSet } from '../result';
import { PARTY_TITLE_PROPERTY, PartyActivator, PartyInternal } from './party-internal';

// HALO data types.
export const HALO_PARTY_DESCRIPTOR_TYPE = 'dxn://dxos/item/halo/party-descriptor';
export const HALO_PARTY_CONTACT_LIST_TYPE = 'dxn://dxos/item/halo/contact-list';
export const HALO_PARTY_PREFERENCES_TYPE = 'dxn://dxos/item/halo/preferences';
export const HALO_PARTY_DEVICE_PREFERENCES_TYPE = 'dxn://dxos/item/halo/device/preferences';

/**
 * A record in HALO party representing a party that user is currently a member of.
 */
export interface JoinedParty {
  partyKey: PublicKey,
  keyHints: KeyHint[],
}

/**
 * Wraps PartyInternal and provides all HALO-related functionality.
 */
export class HaloParty {
  constructor (
    private readonly _party: PartyInternal,
    private readonly _identityKey: PublicKey,
    private readonly _deviceKey: PublicKey
  ) {}

  get identityGenesis () {
    return this._party.processor.credentialMessages.get(this._identityKey.toHex());
  }

  get identityInfo () {
    return this._party.processor.infoMessages.get(this._identityKey.toHex());
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

  get database () {
    return this._party.database;
  }

  get invitationManager () {
    return this._party.invitationManager;
  }

  get preferences () {
    const globalItem = this.getGlobalPreferences();
    const deviceItem = this.getDevicePreferences();

    return defaultsDeep({}, deviceItem?.model.toObject() ?? {}, globalItem?.model.toObject() ?? {});
  }

  async close () {
    await this._party.close();
  }

  // TODO(burdon): Not used?
  async recordPartyJoining (joinedParty: JoinedParty) {
    const knownParties = await this._party.database.queryItems({ type: HALO_PARTY_DESCRIPTOR_TYPE }).value;
    const partyDesc = knownParties.find(partyMarker => joinedParty.partyKey.equals(partyMarker.model.getProperty('publicKey')));
    assert(!partyDesc, `Descriptor already exists for Party ${joinedParty.partyKey.toHex()}`);

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

  isActive (partyKey: PublicKey) {
    const { preferences } = this;
    const partyPrefs = preferences[partyKey.toHex()] ?? {};
    return partyPrefs.active || undefined === partyPrefs.active;
  }

  public getGlobalPartyPreference (partyKey: PublicKey, key: string) {
    const item = this.getGlobalPreferences();
    assert(item, 'Global preference item required.');
    return this._getPartyPreference(item, partyKey, key);
  }

  public async setGlobalPartyPreference (party: PartyInternal, key: string, value: any) {
    const item = this.getGlobalPreferences();
    assert(item, 'Global preference item required.');
    return this._setPartyPreference(item, party, key, value);
  }

  // TODO(burdon): Not used?
  public getDevicePartyPreference (partyKey: PublicKey, key: string) {
    const item = this.getDevicePreferences();
    assert(item, 'Device preference item required.');
    return this._getPartyPreference(item, partyKey, key);
  }

  public async setDevicePartyPreference (party: PartyInternal, key: string, value: any) {
    const item = this.getDevicePreferences();
    assert(item, 'Device preference item required.');
    return this._setPartyPreference(item, party, key, value);
  }

  public _getPartyPreference (preferences: Item<any>, partyKey: PublicKey, key: string) {
    const path = partyKey.toHex();
    const partyPrefs = preferences.model.getProperty(path, {});
    return partyPrefs[key];
  }

  public async _setPartyPreference (preferences: Item<any>, party: PartyInternal, key: string, value: any) {
    const path = party.key.toHex();
    const partyPrefs = preferences.model.getProperty(path, {});
    partyPrefs[key] = value;
    await preferences.model.setProperty(party.key.toHex(), partyPrefs);
    party.update.emit();
  }

  getGlobalPreferences () {
    const [globalItem] = this.database.queryItems({ type: HALO_PARTY_PREFERENCES_TYPE }).value;
    return globalItem;
  }

  getDevicePreferences () {
    const deviceItems = this.database.queryItems({ type: HALO_PARTY_DEVICE_PREFERENCES_TYPE }).value ?? [];
    return deviceItems.find(item => this._deviceKey.equals(item.model.getProperty('publicKey')));
  }

  subscribeToPreferences (cb: (preferences: any) => void) {
    const globalResults = this.database.queryItems({ type: HALO_PARTY_PREFERENCES_TYPE });
    const deviceResults = this.database.queryItems({ type: HALO_PARTY_DEVICE_PREFERENCES_TYPE });

    const event = new Event<any>();

    let before = stableStringify(this.preferences);

    const unsubscribeGlobal = globalResults.subscribe(() => {
      const after = stableStringify(this.preferences);
      if (before !== after) {
        before = after;
        event.emit(this.preferences);
      }
    });

    const unsubscribeDevice = deviceResults.subscribe(() => {
      const after = stableStringify(this.preferences);
      if (before !== after) {
        before = after;
        event.emit(this.preferences);
      }
    });

    event.on(cb);

    return () => {
      unsubscribeGlobal();
      unsubscribeDevice();
    };
  }

  subscribeToJoinedPartyList (cb: (parties: JoinedParty[]) => void): () => void {
    const converter = (partyDesc: Item<any>) => {
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

    const result = new ResultSet<JoinedParty>(
      event,
      () => query.value.map(converter)
    );

    const unsubscribe = result.subscribe(cb);

    if (result.value.length) {
      event.emit();
    }

    return unsubscribe;
  }

  getContactListItem (): Item<ObjectModel> | undefined {
    return this.database.queryItems({ type: HALO_PARTY_CONTACT_LIST_TYPE }).value[0];
  }

  createPartyActivator (party: PartyInternal): PartyActivator {
    return {
      isActive: () => this.isActive(party.key),
      getLastKnownTitle: () => this.getGlobalPartyPreference(party.key, PARTY_TITLE_PROPERTY),
      setLastKnownTitle: (title: string) => this.setGlobalPartyPreference(party, PARTY_TITLE_PROPERTY, title),
      activate: async ({ device, global }) => {
        if (global) {
          await this.setGlobalPartyPreference(party, 'active', true);
        }
        if (device || (global && device === undefined && !this.isActive(party.key))) {
          await this.setDevicePartyPreference(party, 'active', true);
        }
      },
      deactivate: async ({ device, global }) => {
        if (global) {
          await this.setGlobalPartyPreference(party, 'active', false);
        }
        if (device || (global && device === undefined && this.isActive(party.key))) {
          await this.setDevicePartyPreference(party, 'active', false);
        }
      }
    };
  }
}
