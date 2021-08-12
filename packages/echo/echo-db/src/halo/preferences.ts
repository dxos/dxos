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
import { PartyInternal } from '../parties';
import { ResultSet } from '../result';
import { HALO_PARTY_DESCRIPTOR_TYPE, HALO_PARTY_DEVICE_PREFERENCES_TYPE, HALO_PARTY_PREFERENCES_TYPE, JoinedParty } from './halo-party';

/**
 * Manage settings.
 */
// TODO(burdon): Split into device settings, user preferences, etc. (Expose subset as public API).
export class Preferences {
  constructor (
    // TODO(burdon): Only requires key.
    private readonly _party: PartyInternal,
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
    const globalResults = this._party.database.select(s => s.filter({ type: HALO_PARTY_PREFERENCES_TYPE }).items);
    const deviceResults = this._party.database.select(s => s.filter({ type: HALO_PARTY_DEVICE_PREFERENCES_TYPE }).items);

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
    if (!this._party.isOpen) {
      return null;
    }
    const [globalItem] = this._party.database.select(s => s.filter({ type: HALO_PARTY_PREFERENCES_TYPE }).items).getValue();
    return globalItem;
  }

  getDevicePreferences () {
    if (!this._party.isOpen) {
      return null;
    }
    const deviceItems = this._party.database.select(s => s.filter({ type: HALO_PARTY_DEVICE_PREFERENCES_TYPE }).items).getValue();
    return deviceItems.find(item => this._deviceKey.equals(item.model.getProperty('publicKey')));
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

  // TODO(burdon): DO NOT USE THE PARTY KEY AS A TOP-LEVEL KEY!
  public _getPartyPreference (preferences: Item<any>, partyKey: PublicKey, key: string) {
    const path = partyKey.toHex();
    const partyPrefs = preferences.model.getProperty(path, {});
    return partyPrefs[key];
  }

  // TODO(burdon): DO NOT USE THE PARTY KEY AS A TOP-LEVEL KEY!
  public async _setPartyPreference (preferences: Item<any>, party: PartyInternal, key: string, value: any) {
    const path = party.key.toHex();
    const partyPrefs = preferences.model.getProperty(path, {});
    partyPrefs[key] = value;
    await preferences.model.setProperty(party.key.toHex(), partyPrefs);
    party.update.emit(); // TODO(burdon): Should subscribe to database changes only?
  }

  async recordPartyJoining (joinedParty: JoinedParty) {
    const knownParties = this._party.database
      .select(s => s.filter({ type: HALO_PARTY_DESCRIPTOR_TYPE }).items)
      .getValue();
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

    const query = this._party.database.select(s => s.filter({ type: HALO_PARTY_DESCRIPTOR_TYPE }).items);

    // Wrap the query event so we can have manual control.
    const event = new Event();
    query.update.on(() => event.emit());

    const result = new ResultSet<JoinedParty>(event, () => query.getValue().map(converter));
    const unsubscribe = result.subscribe(callback);
    if (result.value.length) {
      event.emit();
    }

    return unsubscribe;
  }
}
