//
// Copyright 2021 DXOS.org
//

import { Box, Button, Toolbar } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { ClientInitializer, ErrorBoundary, ProfileInitializer, useClient } from '@dxos/react-client';
import { FullScreen, TestCustomizableDialog } from '@dxos/react-components';
import { PublicKey } from '@dxos/crypto';

import {
  ErrorView,
  usePartyInvitationDialogState,
  usePartyJoinDialogState
} from '../src';

export default {
  title: 'react-framework/Invitations'
};

const Sender = () => {
  const client = useClient();
  const [partyKey, setPartyKey] = useState<PublicKey>();
  const [{ dialogProps }, reset] = usePartyInvitationDialogState(partyKey);

  useEffect(() => {
    setImmediate(async () => {
      const party = await client.echo.createParty();
      setPartyKey(party.key);
    });
  }, []);

  return (
    <Box>
      <Toolbar>
        <Button onClick={reset}>Reset</Button>
      </Toolbar>
      <TestCustomizableDialog
        {...dialogProps}
      />
    </Box>
  );
}

const Receiver = () => {
  const [{ dialogProps }, reset] = usePartyJoinDialogState();

  return (
    <Box>
      <Toolbar>
        <Button onClick={reset}>Reset</Button>
      </Toolbar>
      <TestCustomizableDialog
        {...dialogProps}
      />
    </Box>
  );
}

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
              <Sender />
            </ProfileInitializer>
          </ClientInitializer>

          <ClientInitializer>
            <ProfileInitializer>
              <Receiver />
            </ProfileInitializer>
          </ClientInitializer>
        </Box>
      </ErrorBoundary>
    </FullScreen>
  );
}
