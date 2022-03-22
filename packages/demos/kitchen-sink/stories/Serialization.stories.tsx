//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button } from '@mui/material';

import { Party } from '@dxos/client';
import { ClientProvider, ProfileInitializer } from '@dxos/react-client';
import { FileUploadDialog, FullScreen, useFileDownload } from '@dxos/react-components';
import { usePartySerializer } from '@dxos/react-framework';

import { useTestParty } from './helpers';

export default {
  title: 'KitchenSink/Serialization'
};

const ImportStory = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [party, setParty] = useState<Party | null>();
  const partySerializer = usePartySerializer();

  const handleImportParty = async (files: File[]) => {
    if (files.length) {
      const partyFile = files[0];
      const importedParty = await partySerializer.deserializeParty(partyFile);
      setParty(importedParty);
    }
  };

  return (
    <FullScreen>
      <FileUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onUpload={handleImportParty}
      />
      <Button
        variant='contained'
        color='primary'
        onClick={() => setUploadDialogOpen(true)}
      >
        Import Party
      </Button>
      {party && (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontSize: 20
        }}>
          <span>{`Party imported: ${party.getProperty('title') ?? ''} - ${party.key.toHex()}`}</span>
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
  const party = useTestParty();
  const partySerializer = usePartySerializer();
  const [ref, download] = useFileDownload();

  const handleExportParty = async () => {
    const blob = await partySerializer.serializeParty(party!);
    download(blob, `${party!.getProperty('title') ?? 'Downloaded_Party'}.party`);
  };

  return (
    <FullScreen>
      <a ref={ref} />
      <Button
        variant='contained'
        color='primary'
        disabled={!party}
        onClick={handleExportParty}
      >
        Export Randomly Created Party
      </Button>
      {party && (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontSize: 20
        }}>
          <span>Party to export: {party.getProperty('title')} - {party.key.toHex()}</span>
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
