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

// TODO(wittjosiah): Copied from Kodama, make customizable.
const LABEL_PROPERTY = 'name';
const TYPE_ITEM = 'dxos:type/item';

export const PartyPage = () => {
  const { party } = useOutletContext<{ party?: Party }>();
  const items = useSelection(party?.select().filter({ type: TYPE_ITEM })) ?? [];
  const [name, setName] = useState('');

  const handleCreateItem = useCallback(async () => {
    await party?.database.createItem({
      type: TYPE_ITEM,
      props: { [LABEL_PROPERTY]: name }
    });
    setName('');
  }, [party, name]);

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
            value={item.model.get(LABEL_PROPERTY)}
            onUpdate={name => item.model.set(LABEL_PROPERTY, name)}
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
          value={name}
          onChange={event => setName(event.target.value)}
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
