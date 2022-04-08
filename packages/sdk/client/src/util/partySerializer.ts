//
// Copyright 2022 DXOS.org
//

import { Party } from '../api';
import { Client } from '../client';
import { schema } from '../proto/gen/';

const partyCodec = schema.getCodecForType('dxos.echo.snapshot.PartySnapshot');

export class PartySerializer {
  constructor (
    private readonly _client: Client
  ) {}

  async serializeParty (party: Party) {
    const snapshot = await party.createSnapshot();
    return new Blob([partyCodec.encode(snapshot)]);
  }

  async deserializeParty (partyToImport: File | Uint8Array) {
    let data;
    if (partyToImport instanceof File) {
      data = await new Uint8Array(await partyToImport.arrayBuffer());
    } else {
      data = partyToImport;
    }
    return await this._client.echo.cloneParty(partyCodec.decode(data));
  }
}
