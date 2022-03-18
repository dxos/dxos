//
// Copyright 2022 DXOS.org
//

import { Party, proto } from '@dxos/client';
import { PartyKey } from '@dxos/echo-protocol';
import { useClient, useParty } from '@dxos/react-client';

export const usePartyImportExport = () => {
  const client = useClient();
  const onExportParty = async (party: Party | PartyKey) => {
    const partyToExport = ((party as Party).key ? party : useParty(party as PartyKey)) as Party;

    if (!partyToExport) {
      return null;
    }

    const snapshot = await partyToExport.createSnapshot();

    const blob = new Blob([proto.schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').encode(snapshot)]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${partyToExport.key.toHex()}.party`;
    a.click();
  };

  const onImportParty = async (partyFileToImport: File) => {
    const data = new Uint8Array(await partyFileToImport.arrayBuffer());
    return await client.echo.cloneParty(proto.schema.getCodecForType('dxos.echo.snapshot.PartySnapshot').decode(data));
  };

  return {
    onExportParty,
    onImportParty
  };
};
