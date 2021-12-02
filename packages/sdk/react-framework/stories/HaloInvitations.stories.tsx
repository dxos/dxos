//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import {
  ClientProvider, ConfigProvider, ProfileInitializer, useParties, useRemoteParties, useProfile
} from '@dxos/react-client';
import { CopyText, FullScreen } from '@dxos/react-components';

import {
  ErrorBoundary,
  FrameworkContextProvider,
  HaloSharingDialog,
  JoinHaloDialog
} from '../src';
import { Column } from './helpers';

export default {
  title: 'react-framework/HaloInvitations'
};

const RemoteParties = () => {
  const parties = useRemoteParties();

  return (
    <Box>
      <p>You have {parties.length} parties.</p>
    </Box>
  );
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

interface UserProps {
  sharing?: boolean;
  joining?: boolean;
  remote?: boolean
}

const User = ({ sharing, joining, remote }: UserProps) => {
  const [shareOpen, setShareOpen] = useState(!!sharing && !joining);
  const [joinOpen, setJoinOpen] = useState(!!joining && !sharing);
  const profile = useProfile();

  return (
    <Box>
      <Toolbar>
        {sharing && <Button disabled={shareOpen} onClick={() => setShareOpen(true)}>Share HALO</Button>}
        {joining && <Button disabled={joinOpen} onClick={() => setJoinOpen(true)}>Join HALO</Button>}
      </Toolbar>
      <HaloSharingDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        modal={false}
      />
      <JoinHaloDialog
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        modal={false}
        closeOnSuccess={true}
      />
      <Box sx={{ marginTop: 2, padding: 1 }}>
        {remote ? <RemoteParties /> : <Parties />}
      </Box>
      <Box sx={{ padding: 1 }}>
        <p>{profile?.username ?? 'Profile not created.'}</p>
      </Box>
    </Box>
  );
};

export const Primary = () => {
  return (
    <FullScreen>
      <FrameworkContextProvider>
        <ErrorBoundary>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-around'
          }}>
            <ClientProvider>
              <ProfileInitializer>
                <FrameworkContextProvider>
                  <Column>
                    <User sharing />
                  </Column>
                </FrameworkContextProvider>
              </ProfileInitializer>
            </ClientProvider>

            <ClientProvider>
              <Column>
                <User joining />
              </Column>
            </ClientProvider>
          </Box>
        </ErrorBoundary>
      </FrameworkContextProvider>
    </FullScreen>
  );
};

export const Remote = () => {
  const remoteConfig: ConfigProvider = {
    system: {
      remote: true
    }
  };

  return (
    <FullScreen>
      <p>Caution: This story works with Wallet extension. It does not work when embedded in an iframe. Use story directly with /#/__story/ prefix.</p>
      <FrameworkContextProvider>
        <ErrorBoundary>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-around'
          }}>
            <ClientProvider config={remoteConfig}>
              <Column>
                <User remote sharing joining />
              </Column>
            </ClientProvider>
          </Box>
        </ErrorBoundary>
      </FrameworkContextProvider>
    </FullScreen>
  );
};
