//
// Copyright 2021 DXOS.org
//

import { Box, Button, Toolbar, styled } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { ClientInitializer, ErrorBoundary, ProfileInitializer, useClient } from '@dxos/react-client';
import { FullScreen, TestCustomizableDialog } from '@dxos/react-components';

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
};

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
};

// TODO(burdon): Error handling, retry, etc.

const Column = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  flexShrink: 0,
  margin: 16
});

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
            <ProfileInitializer>
              <Column>
                <Receiver />
              </Column>
            </ProfileInitializer>
          </ClientInitializer>
        </Box>
      </ErrorBoundary>
    </FullScreen>
  );
};
