//
// Copyright 2021 DXOS.org
//

import { Box, Button, Toolbar, styled } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { ClientInitializer, ErrorBoundary, ProfileInitializer, useClient, useParties } from '@dxos/react-client';
import { FullScreen, CopyText, TestCustomizableDialog } from '@dxos/react-components';

import {
  ErrorView,
  usePartyInvitationDialogState,
  usePartyJoinDialogState
} from '../src';

export default {
  title: 'react-framework/Invitations'
};

const Parties = () => {
  const parties = useParties();

  return (
    <Box>
      {parties.map(party => (
        <Box>
          <CopyText value={party.key.toHex()} />
        </Box>
      ))}
    </Box>
  );
}

const Sender = () => {
  const client = useClient();
  const [partyKey, setPartyKey] = useState<PublicKey>();
  const { dialogProps, reset } = usePartyInvitationDialogState({ partyKey, open: true });

  const handleCreateParty = async () => {
    const party = await client.echo.createParty();
    setPartyKey(party.key);
  }

  useEffect(() => {
    void handleCreateParty();
  }, []);

  return (
    <Box>
      <Toolbar>
        <Button onClick={reset}>Reset</Button>
        <Button onClick={handleCreateParty}>Create Party</Button>
      </Toolbar>
      <TestCustomizableDialog
        {...dialogProps}
      />
      <Box sx={{ marginTop: 2, padding: 1 }}>
        <Parties />
      </Box>
    </Box>
  );
};

const Receiver = () => {
  const { dialogProps, reset } = usePartyJoinDialogState({ open: true });

  return (
    <Box>
      <Toolbar>
        <Button onClick={reset}>Reset</Button>
      </Toolbar>
      <TestCustomizableDialog
        {...dialogProps}
      />
      <Box sx={{ marginTop: 2, padding: 1 }}>
        <Parties />
      </Box>
    </Box>
  );
};

// TODO(burdon): Error handling, retry, etc.

const Column = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  flex: 1,
  flexShrink: 0,
  padding: 16
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
