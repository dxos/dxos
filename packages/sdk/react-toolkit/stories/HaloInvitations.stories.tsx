//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { ConfigProvider } from '@dxos/config';
import { Runtime } from '@dxos/protocols/proto/dxos/config';
import { ClientProvider, useParties, useProfile } from '@dxos/react-client';
import { ProfileInitializer } from '@dxos/react-client-testing';
import { CopyText, FullScreen } from '@dxos/react-components';

import { ErrorBoundary, HaloSharingDialog, JoinHaloDialog } from '../src';
import { Column } from './helpers';

export default {
  title: 'react-toolkit/HaloInvitations'
};

const RemoteParties = () => {
  const parties = useParties();

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
  sharing?: boolean
  joining?: boolean
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

export const Primary = () => (
  <FullScreen>
    <ErrorBoundary>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-around'
      }}>
        <ClientProvider>
          <ProfileInitializer>
            <Column>
              <User sharing />
            </Column>
          </ProfileInitializer>
        </ClientProvider>

        <ClientProvider>
          <Column>
            <User joining />
          </Column>
        </ClientProvider>
      </Box>
    </ErrorBoundary>
  </FullScreen>
);

export const Remote = () => {
  const remoteConfig: ConfigProvider = {
    version: 1,
    runtime: {
      client: {
        mode: Runtime.Client.Mode.REMOTE
      }
    }
  };

  return (
    <FullScreen>
      <p>Caution: This story works with Wallet extension. It does not work when embedded in an iframe. Use story directly with /#/__story/ prefix.</p>
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
    </FullScreen>
  );
};
