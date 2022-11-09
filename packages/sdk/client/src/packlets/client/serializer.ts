//
// Copyright 2022 DXOS.org
//

import { schema } from '@dxos/protocols';

import { Party } from '../proxies';
import { Client } from './client';

const partyCodec = schema.getCodecForType('dxos.echo.snapshot.PartySnapshot');

/**
 * Import/export party.
 * @deprecated
 */
export class PartySerializer {
  // prettier-ignore
  constructor(
    private readonly _client: Client
  ) {}

  async serializeParty(party: Party) {
    const snapshot = await party.createSnapshot();
    return new Blob([partyCodec.encode(snapshot)]);
  }

  async deserializeParty(data: Uint8Array) {
    return await this._client.echo.cloneParty(partyCodec.decode(data));
  }
}
