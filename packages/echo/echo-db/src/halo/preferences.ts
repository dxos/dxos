//
// Copyright 2020 DXOS.org
//

import assert from 'assert';
import stableStringify from 'json-stable-stringify';
import defaultsDeep from 'lodash/defaultsDeep';

import { Event } from '@dxos/async';
import { PublicKey } from '@dxos/crypto';

import { Item } from '../items';
import { PartyInternal } from '../parties';
import { HALO_PARTY_DEVICE_PREFERENCES_TYPE, HALO_PARTY_PREFERENCES_TYPE } from './halo-party';

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
    const globalResults = this._party.database.queryItems({ type: HALO_PARTY_PREFERENCES_TYPE });
    const deviceResults = this._party.database.queryItems({ type: HALO_PARTY_DEVICE_PREFERENCES_TYPE });

    const event = new Event<any>();

    let before = stableStringify(this.values);

    const unsubscribeGlobal = globalResults.subscribe(() => {
      const after = stableStringify(this.values);
      if (before !== after) {
        before = after;
        event.emit(this.values);
      }
    });

    const unsubscribeDevice = deviceResults.subscribe(() => {
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
    const [globalItem] = this._party.database.queryItems({ type: HALO_PARTY_PREFERENCES_TYPE }).value;
    return globalItem;
  }

  getDevicePreferences () {
    if (!this._party.isOpen) {
      return null;
    }
    const deviceItems = this._party.database.queryItems({ type: HALO_PARTY_DEVICE_PREFERENCES_TYPE }).value ?? [];
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
}
