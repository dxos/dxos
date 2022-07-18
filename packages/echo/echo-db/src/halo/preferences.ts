//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import stableStringify from 'json-stable-stringify';
import defaultsDeep from 'lodash.defaultsdeep';

import { Event } from '@dxos/async';
import { raise } from '@dxos/debug';
import { ObjectModel } from '@dxos/object-model';
import { PublicKey } from '@dxos/protocols';

import { ResultSet } from '../api';
import { Database, Item } from '../packlets/database';
import { IdentityNotInitializedError } from '../packlets/errors';
import { DataParty } from '../parties';
import {
  HALO_PARTY_DESCRIPTOR_TYPE, HALO_PARTY_DEVICE_PREFERENCES_TYPE, HALO_PARTY_PREFERENCES_TYPE, JoinedParty
} from './halo-party';

/**
 * Manage settings.
 */
// TODO(burdon): Split into device settings, user preferences, etc. (Expose subset as public API).
export class Preferences {
  constructor (
    private readonly _getDatabase: () => Database | undefined,
    private readonly _deviceKey: PublicKey
  ) {}

  get values () {
    const globalItem = this.getGlobalPreferences();
    const deviceItem = this.getDevicePreferences();

    return defaultsDeep({}, deviceItem?.model.toObject() ?? {}, globalItem?.model.toObject() ?? {});
  }

  // TODO(burdon): DO NOT USE THE PARTY KEY AS A TOP-LEVEL KEY!
  isPartyActive (partyKey: PublicKey) {
    const partyPrefs = this.values[partyKey.toHex()] ?? {};
    return partyPrefs.active || undefined === partyPrefs.active;
  }

  subscribeToPreferences (callback: (preferences: any) => void) {
    const database = this._getDatabase() ?? raise(new IdentityNotInitializedError());

    const globalResults = database.select({ type: HALO_PARTY_PREFERENCES_TYPE }).exec();
    const deviceResults = database.select({ type: HALO_PARTY_DEVICE_PREFERENCES_TYPE }).exec();

    const event = new Event<any>();

    let before = stableStringify(this.values);

    const unsubscribeGlobal = globalResults.update.on(() => {
      const after = stableStringify(this.values);
      if (before !== after) {
        before = after;
        event.emit(this.values);
      }
    });

    const unsubscribeDevice = deviceResults.update.on(() => {
      const after = stableStringify(this.values);
      if (before !== after) {
        before = after;
        event.emit(this.values);
      }
    });

    event.on(callback);

    return () => {
      unsubscribeGlobal();
      unsubscribeDevice();
    };
  }

  getGlobalPreferences () {
    const database = this._getDatabase();
    if (!database) {
      return;
    }
    const [globalItem] = database.select({ type: HALO_PARTY_PREFERENCES_TYPE }).exec().entities;
    return globalItem;
  }

  getDevicePreferences () {
    const database = this._getDatabase();
    if (!database) {
      return;
    }
    const deviceItems = database.select({ type: HALO_PARTY_DEVICE_PREFERENCES_TYPE }).exec().entities;
    return deviceItems.find(item => this._deviceKey.equals(item.model.get('publicKey')));
  }

  public getGlobalPartyPreference (partyKey: PublicKey, key: string) {
    const item = this.getGlobalPreferences();
    assert(item, 'Global preference item required.');
    return this._getPartyPreference(item, partyKey, key);
  }

  public async setGlobalPartyPreference (party: DataParty, key: string, value: any) {
    const item = this.getGlobalPreferences();
    assert(item, 'Global preference item required.');
    return this._setPartyPreference(item, party, key, value);
  }

  public getDevicePartyPreference (partyKey: PublicKey, key: string) {
    const item = this.getDevicePreferences();
    assert(item, 'Device preference item required.');
    return this._getPartyPreference(item, partyKey, key);
  }

  public async setDevicePartyPreference (party: DataParty, key: string, value: any) {
    const item = this.getDevicePreferences();
    assert(item, 'Device preference item required.');
    return this._setPartyPreference(item, party, key, value);
  }

  // TODO(burdon): DO NOT USE THE PARTY KEY AS A TOP-LEVEL KEY!
  public _getPartyPreference (preferences: Item<any>, partyKey: PublicKey, key: string) {
    const path = partyKey.toHex();
    const partyPrefs = preferences.model.get(path, {});
    return partyPrefs[key];
  }

  // TODO(burdon): DO NOT USE THE PARTY KEY AS A TOP-LEVEL KEY!
  public async _setPartyPreference (preferences: Item<any>, party: DataParty, key: string, value: any) {
    const path = party.key.toHex();
    const partyPrefs = preferences.model.get(path, {});
    partyPrefs[key] = value;
    await preferences.model.set(party.key.toHex(), partyPrefs);
    party.update.emit(); // TODO(burdon): Should subscribe to database changes only?
  }

  async recordPartyJoining (joinedParty: JoinedParty) {
    const database = this._getDatabase();
    if (!database) {
      return;
    }
    const [partyDesc] = database
      .select({ type: HALO_PARTY_DESCRIPTOR_TYPE })
      .filter(partyMarker => joinedParty.partyKey.equals(partyMarker.model.get('publicKey')))
      .exec().entities;
    assert(!partyDesc, `Descriptor already exists for Party: ${joinedParty.partyKey.toHex()}`);

    await database.createItem({
      model: ObjectModel,
      type: HALO_PARTY_DESCRIPTOR_TYPE,
      props: {
        publicKey: joinedParty.partyKey.asBuffer(),
        genesisFeed: joinedParty.genesisFeed.toHex(),
        subscribed: true
      }
    });
  }

  subscribeToJoinedPartyList (callback: (parties: JoinedParty[]) => void): () => void {
    const database = this._getDatabase() ?? raise(new IdentityNotInitializedError());

    const converter = (partyDesc: Item<any>): JoinedParty => ({
      partyKey: PublicKey.from(partyDesc.model.get('publicKey')),
      genesisFeed: PublicKey.from(partyDesc.model.get('genesisFeed'))
    });

    const result = database.select({ type: HALO_PARTY_DESCRIPTOR_TYPE }).exec();

    // Wrap the query event so we can have manual control.
    const event = new Event();
    result.update.on(() => event.emit());

    const resultSet = new ResultSet<JoinedParty>(event, () => result.entities.map(converter));
    const unsubscribe = resultSet.subscribe(callback);
    if (resultSet.value.length) {
      event.emit();
    }

    return unsubscribe;
  }
}
