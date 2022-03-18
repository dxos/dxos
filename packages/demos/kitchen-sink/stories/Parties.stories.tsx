//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, ButtonProps } from '@mui/material';

import { Party } from '@dxos/client';
import { ClientProvider, ProfileInitializer } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { usePartySerializer } from '@dxos/react-framework';

export default {
  title: 'KitchenSink/Parties'
};

const StyledButton = (props: ButtonProps) => {
  return (
    <Button
      variant='contained'
      color='primary'
      {...props}
    >
      {props.children}
    </Button>
  )
};

const InvitationDialogPartyStory = () => {
  const [party, setParty] = useState<Party | null>();
  const partySerializer = usePartySerializer();

  const handleImportParty = async (files: FileList) => {
    const partyFile = files[0];
    const importedParty = await partySerializer.importParty(partyFile);
    setParty(importedParty);
  };

  return (
    <FullScreen>
      <Box display='flex' justifyContent='space-around'>
        <Box>
          <input
            style={{ display: 'none' }}
            id='raised-button-file'
            type='file'
            onChange={e => handleImportParty(e.currentTarget.files)}
          />
          <label htmlFor='raised-button-file'>
            <StyledButton component='span'>
              Import Party
            </StyledButton>
          </label>
        </Box>
        <StyledButton disabled={!party}>
          Export Party
        </StyledButton>
        <StyledButton>
          Create Random Party
        </StyledButton>
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
        <InvitationDialogPartyStory />
      </ProfileInitializer>
    </ClientProvider>
  );
};
