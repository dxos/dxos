//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { ClientInitializer, ErrorBoundary, ProfileInitializer, useParties, useProfile } from '@dxos/react-client';
import { CopyText, FullScreen } from '@dxos/react-components';

import {
  DeviceSharingDialog, ErrorView,
  JoinHaloDialog
} from '../../src';
import { Column } from '../helpers';

const Parties = () => {
  const parties = useParties();

  return (
    <Box>
      {parties.map(party => (
        <Box key={party.key.toHex()}>
          <CopyText value={party.key.toHex()} />
        </Box>
      ))}
    </Box>
  );
};

const Sender = () => {
  const [open, setOpen] = useState(true);
  const profile = useProfile();

  return (
    <Box>
      <Toolbar>
        <Button onClick={() => setOpen(true)}>Open</Button>
      </Toolbar>
      <DeviceSharingDialog
        open={open}
        onClose={() => setOpen(false)}
        modal={false}
      />
      <Box sx={{ marginTop: 2, padding: 1 }}>
        <Parties />
      </Box>
      <Box sx={{ padding: 1 }}>
        <p>{profile?.username}</p>
      </Box>
    </Box>
  );
};

const Receiver = () => {
  const [open, setOpen] = useState(true);
  const profile = useProfile();

  return (
    <Box>
      <Toolbar>
        <Button onClick={() => setOpen(true)}>Open</Button>
      </Toolbar>
      <JoinHaloDialog
        open={open}
        onClose={() => setOpen(false)}
        closeOnSuccess={true}
        modal={false}
      />
      <Box sx={{ marginTop: 2, padding: 1 }}>
        <Parties />
      </Box>
      <Box sx={{ padding: 1 }}>
        <p>{profile?.username ?? 'Profile not created.'}</p>
      </Box>
    </Box>
  );
};

// TODO(burdon): Error handling, retry, etc.

export const Primary = () => {
  return (
    <FullScreen>
      <ErrorBoundary errorComponent={ErrorView}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          <ClientInitializer>
            <ProfileInitializer>
              <Column>
                <Sender />
              </Column>
            </ProfileInitializer>
          </ClientInitializer>

          <ClientInitializer>
            <Column>
              <Receiver />
            </Column>
          </ClientInitializer>
        </Box>
      </ErrorBoundary>
    </FullScreen>
  );
};
