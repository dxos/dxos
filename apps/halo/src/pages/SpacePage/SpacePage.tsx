//
// Copyright 2022 DXOS.org
//

import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Add as CreateIcon,
  ArrowBack as BackIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { Box, Fab, IconButton, TextField } from '@mui/material';

import { useParty, useSelection } from '@dxos/react-client';
import { CustomTextField, HashIcon } from '@dxos/react-components';
import { PartySharingDialog } from '@dxos/react-toolkit';
import { humanize } from '@dxos/util';

import { useSafeSpaceKey } from '../../hooks';

// TODO(wittjosiah): Copied from Kodama, make customizable.
const LABEL_PROPERTY = 'name';
const TYPE_ITEM = 'dxos:type/item';

export const SpacePage = () => {
  const navigate = useNavigate();
  const { space: spaceHex } = useParams();
  const spaceKey = useSafeSpaceKey(spaceHex);
  const space = useParty(spaceKey);
  const items = useSelection(space?.select().filter({ type: TYPE_ITEM })) ?? [];
  const [name, setName] = useState('');
  const [showShare, setShowShare] = useState(false);

  const handleCreateItem = useCallback(async () => {
    await space?.database.createItem({
      type: TYPE_ITEM,
      props: { [LABEL_PROPERTY]: name }
    });
    setName('');
  }, [space, name]);

  if (!space) {
    return null;
  }

  return (
    <Box sx={{
      width: '100%',
      maxWidth: '30rem',
      margin: '0 auto'
    }}>
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        padding: 2
      }}>
        <IconButton onClick={() => navigate('/spaces')}>
          <BackIcon />
        </IconButton>
        <IconButton>
          <HashIcon value={space.key.toHex()} />
        </IconButton>
        <CustomTextField
          value={space.properties.get('title') ?? humanize(space.key)}
          onUpdate={title => space.properties.set('title', title)}
          clickToEdit
        />
      </Box>
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
          placeholder='Add a list item'
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

      <Fab
        onClick={() => setShowShare(true)}
        sx={{
          position: 'absolute',
          bottom: 16,
          right: 16
        }}
      >
        <ShareIcon />
      </Fab>

      <PartySharingDialog
        open={showShare}
        partyKey={space.key}
        onClose={() => setShowShare(false)}
      />
    </Box>
  );
};
