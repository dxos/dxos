//
// Copyright 2022 DXOS.org
//

import { Party } from '../api';
import { Client } from '../client';
import { schema } from '../proto/gen/';

export class PartySerializer {
  private _client: Client;

  constructor (client: Client) {
    this._client = client;
  }

  async exportParty (party: Party) {
    return await this._serializeParty(party);
  }

  async importParty (partyFileToImport: File) {
    const data = await this._deserializeParty(partyFileToImport);
    return await this._client.echo.cloneParty(schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').decode(data));
  }

  private async _deserializeParty (file: File) {
    return new Uint8Array(await file.arrayBuffer());
  }

  private async _serializeParty (party: Party) {
    const snapshot = await party.createSnapshot();
    return new Blob([schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').encode(snapshot)]);
  }
}
