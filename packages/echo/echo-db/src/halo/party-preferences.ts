//
// Copyright 2020 DXOS.org
//

import assert from 'assert';

import { PARTY_TITLE_PROPERTY, PartyInternal } from '../parties';
import { Preferences } from './preferences';

export interface ActivationOptions {
  global?: boolean;
  device?: boolean;
}

/**
 * Wrapper for party preferences. Preferences can be global or device specific.
 * 
 * Includes party activation state.
 */
// TODO(burdon): Rename.
export class PartyPreferences {
  constructor (
    private readonly _preferences: Preferences,
    private readonly _party: PartyInternal
  ) {
    assert(this._party);
  }

  get isActive (): boolean {
    return this._preferences.isPartyActive(this._party.key);
  }

  async setGlobalPreference(property: string, value: any) {
    await this._preferences.setGlobalPartyPreference(this._party, property, value);
  }

  async setDevicePreference(property: string, value: any) {
    await this._preferences.setDevicePartyPreference(this._party, property, value);
  }

  getGlobalPreference (property: string) {
    return this._preferences.getGlobalPartyPreference(this._party.key, property);
  }

  getDevicePreference (property: string) {
    return this._preferences.getDevicePartyPreference(this._party.key, property);
  }

  async activate (options: ActivationOptions) {
    const { device, global } = options;

    if (global) {
      await this.setGlobalPreference('active', true);
    }

    if (device || (global && device === undefined && !this._preferences.isPartyActive(this._party.key))) {
      await this.setDevicePreference('active', true);
    }
  }

  async deactivate (options: ActivationOptions) {
    const { device, global } = options;

    if (global) {
      await this.setGlobalPreference('active', false);
    }

    if (device || (global && device === undefined && this._preferences.isPartyActive(this._party.key))) {
      await this.setDevicePreference('active', false);
    }
  }

  getLastKnownTitle () {
    return this._preferences.getGlobalPartyPreference(this._party.key, PARTY_TITLE_PROPERTY);
  }

  async setLastKnownTitle (title: string) {
    return this._preferences.setGlobalPartyPreference(this._party, PARTY_TITLE_PROPERTY, title);
  }
}
