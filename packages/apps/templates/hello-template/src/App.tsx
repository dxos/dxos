//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import {
  Box,
  Button,
  Checkbox,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField
} from '@mui/material';

import { Item, ObjectModel, Party } from '@dxos/client';
import { useClient, useProfile, useSelection } from '@dxos/react-client';
import { FileUploadDialog, useFileDownload } from '@dxos/react-components';
import {
  JoinPartyDialog,
  PartySharingDialog,
  usePartySerializer
} from '@dxos/react-toolkit';

const Main = () => {
  const client = useClient();
  const [party, setParty] = useState<Party>();

  const inputRef = useRef<HTMLInputElement>();
  const [action, setAction] = useState<string>();

  // 1. Create party.
  useEffect(() => {
    // TODO(wittjosiah): Attempt to load existing party.
    void client.echo.createParty().then((party) => setParty(party));
  }, []);

  // 3. Select items.
  const items = useSelection(party?.select().filter({ type: 'task' })) ?? [];
  items.sort((item1: Item<ObjectModel>, item2: Item<ObjectModel>) => {
    const checked1 = item1.model.get('done');
    const checked2 = item2.model.get('done');
    return checked1 === checked2 ? 0 : checked1 ? 1 : -1;
  });

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

  const handleTaskChecked = (item: Item<ObjectModel>, checked: boolean) => {
    void item.model.set('done', checked);
  };

  const handleExport = async () => {
    const blob = await serializer.serializeParty(party!);
    download(blob, `${party?.key.toHex()}.party`);
  };

  const handleImport = async (files: File[]) => {
    const data = await new Uint8Array(await files[0].arrayBuffer());
    const party = await serializer.deserializeParty(data);
    setParty(party);
  };

  return (
    <Box
      sx={{
        padding: 2,
        width: 800,
        margin: 'auto',
        marginTop: 2,
        border: '1px solid #CCC'
      }}
    >
      <Box sx={{ display: 'flex' }}>
        <TextField
          inputRef={inputRef}
          autoFocus
          fullWidth
          placeholder='Enter task.'
          autoComplete='off'
          spellCheck={false}
          onKeyDown={(event) => event.key === 'Enter' && handleCreateTask()}
        />

        <Button onClick={handleCreateTask}>Add</Button>
      </Box>

      <List sx={{ my: 2 }}>
        {items.map((item) => (
          <ListItemButton key={item.id} disableRipple>
            <ListItemIcon>
              <Checkbox
                checked={item.model.get('done') ?? false}
                onChange={(event) => {
                  handleTaskChecked(item, event.target.checked);
                }}
              />
            </ListItemIcon>
            <ListItemText primary={item.model.get('title')} />
          </ListItemButton>
        ))}
      </List>

      <Box>
        <Button
          sx={{ mr: 1 }}
          variant='outlined'
          onClick={() => setAction('share')}
        >
          Share
        </Button>
        <Button
          sx={{ mr: 1 }}
          variant='outlined'
          onClick={() => setAction('join')}
        >
          Join
        </Button>
        <Button sx={{ mr: 1 }} variant='outlined' onClick={handleExport}>
          Export
        </Button>
        <Button
          sx={{ mr: 1 }}
          variant='outlined'
          onClick={() => setAction('import')}
        >
          Import
        </Button>
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
        onJoin={(party) => setParty(party)}
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

export const App = () => {
  const profile = useProfile();

  if (!profile) {
    return (
      <Box
        sx={{
          marginY: 2,
          marginX: 'auto',
          width: 300,
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <Button
          variant='contained'
          onClick={() => window.open('https://halo.dxos.org', '_blank')}
        >
          Create a HALO identity
        </Button>
      </Box>
    );
  }

  return <Main />;
};
