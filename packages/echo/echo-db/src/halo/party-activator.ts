//
// Copyright 2020 DXOS.org
//

import { PARTY_TITLE_PROPERTY, PartyInternal } from '../parties';
import { HaloParty } from './halo-party';

export interface ActivationOptions {
  global?: boolean;
  device?: boolean;
}

/**
 * Wrapper for party activation state.
 */
// TODO(burdon): Rename.
export class PartyActivator {
  constructor (
    private _halo: HaloParty,
    private _party: PartyInternal
  ) {}

  isActive () {
    return this._halo.preferences.isPartyActive(this._party.key);
  }

  getLastKnownTitle () {
    return this._halo.preferences.getGlobalPartyPreference(this._party.key, PARTY_TITLE_PROPERTY);
  }

  async setLastKnownTitle (title: string) {
    return this._halo.preferences.setGlobalPartyPreference(this._party, PARTY_TITLE_PROPERTY, title);
  }

  async activate (options: ActivationOptions) {
    const { device, global } = options;

    if (global) {
      await this._halo.preferences.setGlobalPartyPreference(this._party, 'active', true);
    }

    if (device || (global && device === undefined && !this._halo.preferences.isPartyActive(this._party.key))) {
      await this._halo.preferences.setDevicePartyPreference(this._party, 'active', true);
    }
  }

  async deactivate (options: ActivationOptions) {
    const { device, global } = options;

    if (global) {
      await this._halo.preferences.setGlobalPartyPreference(this._party, 'active', false);
    }

    if (device || (global && device === undefined && this._halo.preferences.isPartyActive(this._party.key))) {
      await this._halo.preferences.setDevicePartyPreference(this._party, 'active', false);
    }
  }
}
