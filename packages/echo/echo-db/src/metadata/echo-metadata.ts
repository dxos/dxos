//
// Copyright 2021 DXOS.org
//

import { EchoMetadata, PartyMetadata } from '@dxos/echo-protocol';

import { MetadataStore } from './metadata-store';

export class Metadata {
  private _metada: EchoMetadata = {};

  constructor (private readonly _storage: MetadataStore) { }

  async load () {
    this._metada = await this._storage.load();
  }

  async addParty (party: PartyMetadata) {
    if (!this._metada.parties) {
      this._metada.parties = [party];
    } else {
      this._metada.parties?.push(party);
    }
    await this._storage.save(this._metada);
  }

  get parties () {
    return this._metada.parties ?? [];
  }
}
