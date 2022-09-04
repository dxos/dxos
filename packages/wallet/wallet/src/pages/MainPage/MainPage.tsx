//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useNavigate } from 'react-router-dom';

import { Add as CreateIcon } from '@mui/icons-material';
import { Box, Fab, Typography } from '@mui/material';

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
        {parties?.length === 0 && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography sx={{ paddingY: 4 }}>Create a party!</Typography>
          </Box>
        )}
        {parties?.length > 0 && (
          <PartyList
            parties={parties}
            onSelect={partyKey => {
              navigate(`/${partyKey.toHex()}`);
            }}
          />
        )}
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
