//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { Space } from '@dxos/client';
import { useAsyncEffect } from '@dxos/react-async';
import { ClientProvider, useClient } from '@dxos/react-client';
import { FileUploadDialog, FullScreen, useFileDownload } from '@dxos/react-components-deprecated';

import { useSpaceSerializer } from '../src';
import { ProfileInitializer } from './helpers';

export default {
  title: 'KitchenSink/Serialization'
};

const ImportStory = () => {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [space, setSpace] = useState<Space | null>();
  const spaceSerializer = useSpaceSerializer();

  const handleImportSpace = async (files: File[]) => {
    if (files.length) {
      const data = await new Uint8Array(await files[0].arrayBuffer());
      const importedSpace = await spaceSerializer.deserializeSpace(data);
      setSpace(importedSpace);
    }
  };

  return (
    <FullScreen>
      <FileUploadDialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        onUpload={handleImportSpace}
      />
      <Toolbar>
        <Button variant='contained' color='primary' onClick={() => setUploadDialogOpen(true)}>
          Import
        </Button>
      </Toolbar>
      {space && <Box sx={{ padding: 2 }}>Space: {space.key.toHex()}</Box>}
    </FullScreen>
  );
};

export const ImportSpace = () => (
  <ClientProvider>
    <ProfileInitializer>
      <ImportStory />
    </ProfileInitializer>
  </ClientProvider>
);

const ExportStory = () => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();
  useAsyncEffect(async () => {
    setSpace(await client.echo.createSpace());
  }, []);

  const spaceSerializer = useSpaceSerializer();
  const download = useFileDownload();

  const handleExportSpace = async () => {
    const blob = await spaceSerializer.serializeSpace(space!);
    download(blob, `${space!.key.toHex()}.space`);
  };

  return (
    <FullScreen>
      <Toolbar>
        <Button variant='contained' color='primary' disabled={!space} onClick={handleExportSpace}>
          Export
        </Button>
      </Toolbar>
      {space && <Box sx={{ padding: 2 }}>Space: {space.key.toHex()}</Box>}
    </FullScreen>
  );
};

export const ExportSpace = () => (
  <ClientProvider>
    <ProfileInitializer>
      <ExportStory />
    </ProfileInitializer>
  </ClientProvider>
);
