//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, Toolbar } from '@mui/material';

import { ClientInitializer, ErrorBoundary, ProfileInitializer, useParties, useProfile } from '@dxos/react-client';
import { CopyText, FullScreen } from '@dxos/react-components';

import {
  HaloSharingDialog, ErrorView,
  JoinHaloDialog
} from '../src';
import { Column } from './helpers';
import { SuppliedConfig } from '@dxos/react-client/src/config';

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

interface UserProps {
  sharing?: boolean;
  joining?: boolean;
}

const User = ({sharing, joining}: UserProps) => {
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
                <User sharing />
              </Column>
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
  }

  return (
    <FullScreen>
      <ErrorBoundary errorComponent={ErrorView}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-around'
        }}>
          <ClientInitializer config={remoteConfig}>
            <Column>
              <User sharing joining />
            </Column>
          </ClientInitializer>
        </Box>
      </ErrorBoundary>
    </FullScreen>
  );
};
