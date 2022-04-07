//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { Box, Button, List, ListItem, ListItemText, TextField } from '@mui/material';

import { Party } from '@dxos/client';
import { useClient, useSelection } from '@dxos/react-client';
import { FileUploadDialog, useFileDownload } from '@dxos/react-components';
import { JoinPartyDialog, PartySharingDialog, usePartySerializer } from '@dxos/react-framework';

/**
 * @constructor
 */
export const App = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();

  const inputRef = useRef<HTMLInputElement>();
  const [action, setAction] = useState<string>();

  // 1. Create party.
  useEffect(() => {
    void client.echo.createParty().then(party => setParty(party));
  }, []);

  // 3. Select items.
  const items = useSelection(party?.select().filter({ type: 'task' })) ?? [];

  // 6. Serialize.
  const serializer = usePartySerializer();
  const download = useFileDownload();

  if (!party) {
    return null;
  }

  // 2. Create item.
  const handleCreateTask = () => {
    const title = inputRef.current!.value.trim();
    if (title) {
      void party!.database.createItem({
        type: 'task',
        props: {
          title
        }
      });
    }

    inputRef.current!.value = '';
    inputRef.current!.focus();
  };

  const handleExport = async () => {
    const blob = await serializer.serializeParty(party!);
    download(blob, `${party?.key.toHex()}.party`);
  };

  const handleImport = async (file: File) => {
    const party = await serializer.deserializeParty(file);
    setParty(party);
  };

  return (
    <Box sx={{ padding: 2, width: 800, margin: 'auto', marginTop: 2, border: '1px solid #CCC' }}>
      <Box sx={{ display: 'flex' }}>
        <TextField
          inputRef={inputRef}
          autoFocus
          fullWidth
          autoComplete='off'
          spellCheck={false}
          onKeyDown={event => event.key === 'Enter' && handleCreateTask()}
        />

        <Button onClick={handleCreateTask}>Add</Button>
      </Box>

      <List>
        {items.map(item => (
          <ListItem key={item.id}>
            <ListItemText primary={item.model.get('title')} />
          </ListItem>
        ))}
      </List>

      <Box>
        <Button onClick={() => setAction('share')}>Share</Button>
        <Button onClick={() => setAction('join')}>Join</Button>
        <Button onClick={handleExport}>Export</Button>
        <Button onClick={() => setAction('import')}>Import</Button>
      </Box>

      {/* 4. Sharing. */}
      <PartySharingDialog
        open={action === 'share'}
        onClose={() => setAction(undefined)}
        partyKey={party.key}
      />

      {/* 5. Joining. */}
      <JoinPartyDialog
        open={action === 'join'}
        onJoin={party => setParty(party)}
        onClose={() => setAction(undefined)}
        closeOnSuccess={true}
      />

      {/* 6. Import. */}
      <FileUploadDialog
        open={action === 'import'}
        onClose={() => setAction(undefined)}
        onUpload={handleImport}
      />
    </Box>
  );
};
