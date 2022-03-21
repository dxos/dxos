//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, ButtonTypeMap, ExtendButtonBase } from '@mui/material';

import { Party } from '@dxos/client';
import { ClientProvider, ProfileInitializer, useClient } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { usePartySerializer } from '@dxos/react-framework';

import { createMockPartyData } from './helpers';

export default {
  title: 'KitchenSink/Parties'
};

const ImportStory = () => {
  const [party, setParty] = useState<Party | null>();
  const partySerializer = usePartySerializer();

  const handleImportParty = async (files: FileList | null) => {
    if (!files) {
      return;
    }
    const partyFile = files[0];
    const importedParty = await partySerializer.importParty(partyFile);
    setParty(importedParty);
  };

  return (
    <FullScreen>
      <Box>
        <input
          style={{ display: 'none' }}
          id='raised-button-file'
          type='file'
          onChange={e => handleImportParty(e.currentTarget.files)}
        />
        <label htmlFor='raised-button-file'>
          <Button
            variant='contained'
            color='primary'
            component='span'
          >
            Import Party
          </Button>
        </label>
      </Box>
      {party && (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontSize: 20
        }}>
          <span>Party was imported. Party key: </span>
          <span>{party.key.toHex()}</span>
        </Box>
      )}
    </FullScreen>
  );
};

export const ImportParty = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <ImportStory />
      </ProfileInitializer>
    </ClientProvider>
  );
};

const ExportStory = () => {
  const client = useClient();
  const [party, setParty] = useState<Party | null>();
  const partySerializer = usePartySerializer();

  const handleCreateRandomParty = async () => {
    const newParty = await client.echo.createParty();
    await createMockPartyData(newParty);
    setParty(newParty);
  };

  const handleExportParty = async () => {
    if (party) {
      await partySerializer.exportParty(party);
    }
  };

  return (
    <FullScreen>
      <Box display='flex' justifyContent='space-around'>
        <Button
         variant='contained'
         color='primary'
         onClick={handleCreateRandomParty}
        >
          Create Random Party
        </Button>
        <Button
          variant='contained'
          color='primary'
          disabled={!party}
          onClick={handleExportParty}
        >
          Export Party
        </Button>
      </Box>
      {party && (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontSize: 20
        }}>
          <span>Party was created. Party key: </span>
          <span>{party.key.toHex()}</span>
        </Box>
      )}
    </FullScreen>
  );
};

export const ExportParty = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <ExportStory />
      </ProfileInitializer>
    </ClientProvider>
  );
};
