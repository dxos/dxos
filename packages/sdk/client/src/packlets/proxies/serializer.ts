//
// Copyright 2022 DXOS.org
//

import { schema } from '@dxos/protocols';

import { Party } from '../api/index.js';
import { Client } from './client.js';

const partyCodec = schema.getCodecForType('dxos.echo.snapshot.PartySnapshot');

/**
 * Import/export party.
 */
export class PartySerializer {
  constructor (
    private readonly _client: Client
  ) {}

  async serializeParty (party: Party) {
    const snapshot = await party.createSnapshot();
    return new Blob([partyCodec.encode(snapshot)]);
  }

  async deserializeParty (data: Uint8Array) {
    return await this._client.echo.cloneParty(partyCodec.decode(data));
  }
}
