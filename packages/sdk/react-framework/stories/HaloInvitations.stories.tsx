//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { ClientInitializer, ErrorBoundary, ProfileInitializer, useParties, useRemoteParties, useProfile, SuppliedConfig } from '@dxos/react-client';
import { CopyText, FullScreen } from '@dxos/react-components';

import {
  ErrorView,
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
        remote={remote}
      />
      <JoinHaloDialog
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        modal={false}
        closeOnSuccess={true}
        remote={remote}
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
      <ErrorBoundary>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          <ClientInitializer>
            <ProfileInitializer>
              <FrameworkContextProvider>
                <Column>
                  <User sharing />
                </Column>
              </FrameworkContextProvider>
            </ProfileInitializer>
          </ClientInitializer>

          <ClientInitializer>
            <Column>
              <User joining />
            </Column>
          </ClientInitializer>
        </Box>
      </ErrorBoundary>
    </FullScreen>
  );
};

export const Remote = () => {
  const remoteConfig: SuppliedConfig = {
    system: {
      remote: true
    }
  };

  return (
    <FullScreen>
      <FrameworkContextProvider>
        <ErrorBoundary errorComponent={ErrorView}>
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-around'
          }}>
            <ClientInitializer config={remoteConfig}>
              <Column>
                <User remote sharing joining />
              </Column>
            </ClientInitializer>
          </Box>
        </ErrorBoundary>
      </FrameworkContextProvider>
    </FullScreen>
  );
};
