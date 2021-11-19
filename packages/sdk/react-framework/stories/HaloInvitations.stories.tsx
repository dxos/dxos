//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { ClientInitializer, ErrorBoundary, ProfileInitializer, useParties, useProfile } from '@dxos/react-client';
import { CopyText, FullScreen } from '@dxos/react-components';

import {
  ErrorView,
  FrameworkContext,
  HaloSharingDialog,
  JoinHaloDialog,
  useFrameworkContextState
} from '../src';
import { Column } from './helpers';

export default {
  title: 'react-framework/HaloInvitations'
};

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
      {open && (
        <HaloSharingDialog
          open={open}
          onClose={() => setOpen(false)}
          modal={false}
        />
      )}
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
  const state = useFrameworkContextState();

  return (
    <FullScreen>
      <ErrorBoundary errorComponent={ErrorView}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          <ClientInitializer>
            <ProfileInitializer>
              <FrameworkContext.Provider value={state}>
                <Column>
                  <Sender />
                </Column>
              </FrameworkContext.Provider>
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
