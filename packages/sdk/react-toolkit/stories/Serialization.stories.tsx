//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { Party } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';
import { ProfileInitializer, useTestParty } from '@dxos/react-client-testing';
import {
  FileUploadDialog,
  FullScreen,
  useFileDownload
} from '@dxos/react-components';

import { usePartySerializer } from '../src';

export default {
  title: 'KitchenSink/Serialization'
};

const ImportStory = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [party, setParty] = useState<Party | null>();
  const partySerializer = usePartySerializer();

  const handleImportParty = async (files: File[]) => {
    if (files.length) {
      const data = await new Uint8Array(await files[0].arrayBuffer());
      const importedParty = await partySerializer.deserializeParty(data);
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
      <Toolbar>
        <Button
          variant='contained'
          color='primary'
          onClick={() => setUploadDialogOpen(true)}
        >
          Import
        </Button>
      </Toolbar>
      {party && <Box sx={{ padding: 2 }}>Party: {party.key.toHex()}</Box>}
    </FullScreen>
  );
};

export const ImportParty = () => (
  <ClientProvider>
    <ProfileInitializer>
      <ImportStory />
    </ProfileInitializer>
  </ClientProvider>
);

const ExportStory = () => {
  const party = useTestParty();
  const partySerializer = usePartySerializer();
  const download = useFileDownload();

  const handleExportParty = async () => {
    const blob = await partySerializer.serializeParty(party!);
    download(blob, `${party!.key.toHex()}.party`);
  };

  return (
    <FullScreen>
      <Toolbar>
        <Button
          variant='contained'
          color='primary'
          disabled={!party}
          onClick={handleExportParty}
        >
          Export
        </Button>
      </Toolbar>
      {party && <Box sx={{ padding: 2 }}>Party: {party.key.toHex()}</Box>}
    </FullScreen>
  );
};

export const ExportParty = () => (
  <ClientProvider>
    <ProfileInitializer>
      <ExportStory />
    </ProfileInitializer>
  </ClientProvider>
);
