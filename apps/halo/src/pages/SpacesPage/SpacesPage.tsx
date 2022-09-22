//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Add as CreateIcon, Redeem as JoinIcon } from '@mui/icons-material';
import { Box, SpeedDial, SpeedDialAction, SpeedDialIcon, Typography } from '@mui/material';

import { useClient, useParties } from '@dxos/react-client';
import { JoinPartyDialog } from '@dxos/react-toolkit';

import { SpaceList } from '../../components';

export const SpacesPage = () => {
  const client = useClient();
  const spaces = useParties();
  const navigate = useNavigate();
  const [showJoin, setShowJoin] = useState(false);

  const actions = [
    {
      icon: <CreateIcon />,
      name: 'Create',
      onClick: async () => {
        await client.echo.createParty();
      }
    },
    {
      icon: <JoinIcon />,
      name: 'Join',
      onClick: () => {
        setShowJoin(true);
      }
    }
  ];

  return (
    <Box sx={{ overflow: 'auto' }}>
      <Box
        sx={{
          maxWidth: '25rem',
          margin: '0 auto'
        }}
      >
        {spaces?.length === 0 && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography sx={{ paddingY: 4 }}>Create a space!</Typography>
          </Box>
        )}
        {spaces?.length > 0 && (
          <SpaceList
            spaces={spaces}
            onSelect={spaceKey => {
              navigate(`/spaces/${spaceKey.toHex()}`);
            }}
          />
        )}
        <SpeedDial
          ariaLabel='Add party'
          icon={<SpeedDialIcon />}
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16
          }}
        >
          {actions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={action.onClick}
            />
          ))}
        </SpeedDial>
      </Box>

      <JoinPartyDialog
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoin={space => navigate(`/spaces/${space.key.toHex()}`)}
      />
    </Box>
  );
};
