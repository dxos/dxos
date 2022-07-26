//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Add as CreateIcon } from '@mui/icons-material';
import { Box, Fab } from '@mui/material';

import { useClient, useParties } from '@dxos/react-client';

import { PartyList } from '../../components';

export const MainPage = () => {
  const client = useClient();
  const parties = useParties();
  const navigate = useNavigate();

  const handleCreateParty = async () => {
    await client.echo.createParty();
  };

  return (
    <Box sx={{ overflow: 'auto' }}>
      <Box
        sx={{
          maxWidth: '25rem',
          margin: '0 auto'
        }}
      >
        <PartyList
          parties={parties}
          onSelect={partyKey => {
            navigate(`/${partyKey.toHex()}`);
          }}
        />
        <Fab
          onClick={handleCreateParty}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16
          }}
        >
          <CreateIcon />
        </Fab>
      </Box>
    </Box>
  );
};
