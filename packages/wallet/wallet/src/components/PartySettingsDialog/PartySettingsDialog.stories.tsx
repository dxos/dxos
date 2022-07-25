//
// Copyright 2021 DXOS.org
//

import all from 'it-all';
import React, { useState } from 'react';
import { concat } from 'uint8arrays/concat';

import { Box, Button } from '@mui/material';

import { Party } from '@dxos/client';
import { ClientProvider, useClient } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';
import { JsonTreeView, useFileDownload } from '@dxos/react-components';
import { useIpfsClient } from '@dxos/react-ipfs';
import { usePartySerializer } from '@dxos/react-toolkit';

import { usePartyFileImportOption } from '../../hooks';
import { ImportIpfsDialog } from '../ImportIpfsDialog';
import { ImportOption } from '../ImportMenu';
import { PartySettingsDialog } from './PartySettingsDialog';

const IPFS_PUB = 'https://ipfs-pub1.kube.dxos.network';

export default {
  title: 'PartySettingsDialog'
};

const usePartyImportOptions = (): ImportOption[] => {
  const ipfsClient = useIpfsClient(IPFS_PUB);
  const partySerializer = usePartySerializer();
  const partyFileOption = usePartyFileImportOption();

  const handleIpfsImport = async (cid: string) => {
    if (!ipfsClient) {
      return;
    }

    const data = concat(await all(ipfsClient.cat(cid)));
    const party = await partySerializer.deserializeParty(data);
    return party;
  };

  return [
    partyFileOption,
    {
      name: 'ipfs',
      displayName: 'From IPFS',
      dialog: ({ onClose, onImport }) => (
        <ImportIpfsDialog
          open
          hideBackdrop
          onClose={onClose}
          onImport={async cid => {
            const party = await handleIpfsImport(cid);
            party && onImport?.(party);
          }}
        />
      )
    }
  ];
};

const Story = () => {
  const client = useClient();
  const [open, setOpen] = useState(true);
  const [party, setParty] = useState<Party>();
  const importOptions = usePartyImportOptions();
  const partySerializer = usePartySerializer();
  const download = useFileDownload();

  const handleExport = async () => {
    if (!party) {
      return;
    }

    const data = await partySerializer.serializeParty(party);
    download(data, `${party.key.toHex()}.party`);
  };

  return (
    <>
      <Box sx={{ padding: 2 }}>
        <Box sx={{ marginBottom: 1 }}>
          <Button sx={{ marginRight: 1 }} onClick={() => setOpen(true)}>Open</Button>
          <Button disabled={!party} onClick={handleExport}>Export</Button>
        </Box>
        <JsonTreeView
          data={{
            partyKey: party?.key,
            title: party?.getProperty('title'),
            description: party?.getProperty('description')
          }}
        />
      </Box>

      <PartySettingsDialog
        open={open}
        party={party}
        importOptions={importOptions}
        onClose={() => setOpen(false)}
        onUpdate={async (party?: Party, title?: string, description?: string) => {
          if (!party) {
            party = await client.echo.createParty();
          }

          // TODO(burdon): BUG: Undefined should remove property.
          await party.setProperty('title', title ?? '');
          await party.setProperty('description', description ?? '');

          setParty(party);
        }}
        onImport={async party => setParty(party)}
      />
    </>
  );
};

export const Primary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <Story />
      </ProfileInitializer>
    </ClientProvider>
  );
};
