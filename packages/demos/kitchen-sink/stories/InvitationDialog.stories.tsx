//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { useState } from 'react';

import { Box } from '@mui/material';

import { Party } from '@dxos/client';
import { ClientProvider, ProfileInitializer } from '@dxos/react-client';
import { FullScreen } from '@dxos/react-components';
import { usePartyImportExport } from '@dxos/react-framework';

import { InvitationDialog } from '../src';

export default {
  title: 'KitchenSink/InvitationDialog'
};

faker.seed(100);

const App = () => {
  return (
    <FullScreen>
      <InvitationDialog
        open
        title='Kitchen Sink'
        onCreate={() => {}}
        onJoin={(invitationCode: string) => {}}
        onImportParty={() => {}}
      />
    </FullScreen>
  );
};

export const Primary = () => {
  return (
    <ClientProvider>
      <ProfileInitializer>
        <App />
      </ProfileInitializer>
    </ClientProvider>
  );
};

const InvitationDialogImportPartyStory = () => {
  const [party, setParty] = useState<Party>();
  const { onImportParty } = usePartyImportExport();

  const handleImportParty = async (partyFile: File) => {
    const importedParty = await onImportParty(partyFile);
    setParty(importedParty);
  };

  return (
    <FullScreen>
      <InvitationDialog
        open
        title='Import Party Testing'
        onCreate={() => {}}
        onJoin={() => {}}
        onImportParty={handleImportParty}
      />
      {party && (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontSize: 20,
          '.MuiBackdrop-root': {
            bgcolor: undefined
          }
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
        <InvitationDialogImportPartyStory />
      </ProfileInitializer>
    </ClientProvider>
  );
};
