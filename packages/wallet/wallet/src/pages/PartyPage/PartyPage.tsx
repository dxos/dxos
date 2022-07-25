//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { Add as CreateIcon } from '@mui/icons-material';
import { Box, IconButton, TextField } from '@mui/material';

import { Party } from '@dxos/client';
import { useSelection } from '@dxos/react-client';
import { CustomTextField } from '@dxos/react-components';

export const PartyPage = () => {
  const { party } = useOutletContext<{ party?: Party }>();
  const items = useSelection(party?.select().children()) ?? [];
  const [title, setTitle] = useState('');

  const handleCreateItem = useCallback(async () => {
    await party?.database.createItem({ props: { title } });
    setTitle('');
  }, [party, title]);

  return (
    <Box sx={{
      width: '100%',
      maxWidth: '30rem',
      margin: '0 auto'
    }}>
      <Box sx={{
        overflowY: 'auto'
      }}>
        {items.map(item => (
          <CustomTextField
            key={item.id}
            value={item.model.get('title')}
            clickToEdit
          />
        ))}
      </Box>
      <Box sx={{
        display: 'flex',
        paddingTop: 1,
        paddingBottom: 1,
        paddingLeft: 2,
        paddingRight: 2,
        flexShrink: 0
      }}>
        <TextField
          value={title}
          onChange={event => setTitle(event.target.value)}
          onKeyDown={async ({ key }) => {
            if (key === 'Enter') {
              await handleCreateItem();
            }
          }}
          variant='standard'
          size='small'
          hiddenLabel
          sx={{
            flex: 1
          }}
        />
        <IconButton
          onClick={handleCreateItem}
          size='small'
        >
          <CreateIcon />
        </IconButton>
      </Box>
    </Box>
  );
};
