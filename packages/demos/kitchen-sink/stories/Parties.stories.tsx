//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button } from '@mui/material';

import { Party } from '@dxos/client';
import { ClientProvider, ProfileInitializer } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { usePartyImportExport } from '@dxos/react-framework';

export default {
  title: 'KitchenSink/Parties'
};

const StyledButton = (props: any) => {
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
  const { onExportParty, onImportParty } = usePartyImportExport();

  const handleImportParty = async (partyFile: File) => {
    const importedParty = await onImportParty(partyFile);
    setParty(importedParty);
  };

  return (
    <FullScreen>
      <Box>
        <StyledButton>
          Import Party
        </StyledButton>
        <StyledButton>
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
  )
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

