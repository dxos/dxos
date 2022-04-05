//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { Box, Button, List, ListItem, ListItemText, TextField } from '@mui/material';

import { Party } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';
import { useClient, useSelection } from '@dxos/react-client';
import { JoinPartyDialog, PartySharingDialog } from '@dxos/react-framework';

export const App = () => {
  const inputRef = useRef<HTMLInputElement>();

  const [sharing, setSharing] = useState(false);
  const [joining, setJoining] = useState(false);

  const client = useClient();
  const [party, setParty] = useState<Party>();

  // 3. Select items.
  const items = useSelection(party?.select()) ?? [];

  // 1. Create party.
  useEffect(() => {
    void client.echo.createParty().then(party => setParty(party));
  }, []);

  if (!party) {
    return null;
  }

  // 2. Create item.
  const handleClick = () => {
    void party!.database.createItem({
      props: {
        title: inputRef.current!.value
      }
    });

    inputRef.current!.value = '';
    inputRef.current!.focus();
  };

  return (
    <Box sx={{ padding: 1 }}>
      <Box sx={{ display: 'flex' }}>
        <TextField
          inputRef={inputRef}
          autoFocus
          fullWidth
          autoComplete='off'
          spellCheck={false}
        />

        <Button onClick={handleClick}>Add</Button>
        <Button onClick={() => setSharing(true)}>Share</Button>
        <Button onClick={() => setJoining(true)}>Join</Button>
      </Box>

      <List>
        {items.map(item => (
          <ListItem key={item.id}>
            <ListItemText primary={item.model.get('title')} />
          </ListItem>
        ))}
      </List>

      {/* 4. Sharing. */}
      <PartySharingDialog
        open={sharing}
        onClose={() => setSharing(false)}
        partyKey={party.key}
      />

      {/* 5. Joining. */}
      <JoinPartyDialog
        open={joining}
        onJoin={party => setParty(party)}
        onClose={() => setJoining(false)}
        closeOnSuccess={true}
      />
    </Box>
  );
};
