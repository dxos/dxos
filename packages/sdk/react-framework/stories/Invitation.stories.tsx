//
// Copyright 2021 DXOS.org
//

import { Box, Button, Toolbar, styled } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { ClientInitializer, ErrorBoundary, ProfileInitializer, useClient, useParties } from '@dxos/react-client';
import { FullScreen, CopyText } from '@dxos/react-components';

import {
  ErrorView,
  PartyInvitationDialog,
  PartyJoinDialog,
} from '../src';

export default {
  title: 'react-framework/Invitations'
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
  const [partyKey, setPartyKey] = useState<PublicKey>();
  const client = useClient();

  const handleCreateParty = async () => {
    const party = await client.echo.createParty();
    setPartyKey(party.key);
  };

  useEffect(() => {
    void handleCreateParty();
  }, []);

  return (
    <Box>
      <Toolbar>
        <Button onClick={() => setOpen(true)}>Open</Button>
        <Button onClick={handleCreateParty}>Create Party</Button>
      </Toolbar>
      <PartyInvitationDialog
        partyKey={partyKey}
        open={open}
        onClose={() => setOpen(false)}
        modal={false}
      />
      <Box sx={{ marginTop: 2, padding: 1 }}>
        <Parties />
      </Box>
    </Box>
  );
};

const Receiver = () => {
  const [open, setOpen] = useState(true);

  return (
    <Box>
      <Toolbar>
        <Button onClick={() => setOpen(true)}>Open</Button>
      </Toolbar>
      <PartyJoinDialog
        open={open}
        onClose={() => setOpen(false)}
        closeOnSuccess={false}
        modal={false}
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
