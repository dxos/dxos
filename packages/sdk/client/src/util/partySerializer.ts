//
// Copyright 2022 DXOS.org
//

import { Party } from '../api';
import { Client } from '../client';
import { schema } from '../proto/gen/';

export class PartySerializer {
  constructor (
    private readonly _client: Client
  ) {}

  async serializeParty (party: Party) {
    const snapshot = await party.createSnapshot();
    return new Blob([schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').encode(snapshot)]);
  }

  async deserializeParty (partyFileToImport: File) {
    const data = await new Uint8Array(await partyFileToImport.arrayBuffer());
    return await this._client.echo.cloneParty(schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').decode(data));
  }
}
