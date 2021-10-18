//
// Copyright 2021 DXOS.org
//

import {
  Box, Button, Divider, Paper, TextField, Toolbar
} from '@mui/material';
import React, { useState } from 'react';

import { defaultSecretValidator } from '@dxos/credentials';
import { InvitationAuthenticator } from '@dxos/echo-db';

import {
  ClientInitializer,
  decodeInvitation,
  encodeInvitation,
  ProfileInitializer,
  useClient,
  useParties,
  useProfile
} from '../src';
import {
  useSecretProvider,
  ClientPanel,
  RedeemInvitationPanel,
  useProvider,
  Container
} from './helpers';

export default {
  title: 'react-client/HALO Invitations'
};

// debug.enable('dxos:*');

/**
 * Creates device invitation.
 */
const HaloInvitationContainer = () => {
  const client = useClient();
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretProvider();

  const handleCreateInvitation = async () => {
    // TODO(burdon): Remove? Where is this used?
    // const authenticator: InvitationAuthenticator = defaultInvitationAuthenticator;
    const authenticator: InvitationAuthenticator = {
      secretProvider,
      secretValidator: defaultSecretValidator // TODO(burdon): Normalize with other invitation methods.
    };

    // TODO(burdon): Move to client package method.
    // TODO(burdon): Don't use default (normalize with invitation flow).
    const invitation = await client.echo.halo.createInvitation(authenticator, {
      onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
        setInvitationCode(undefined);
        resetPin();
      }
    });

    setInvitationCode(encodeInvitation(invitation));
  };

  if (!client.halo.isInitialized) {
    return null;
  }

  return (
    <Box sx={{ padding: 1 }}>
      <Toolbar>
        <Button
          onClick={handleCreateInvitation}
        >
          Create Invitation
        </Button>
      </Toolbar>

      {invitationCode && (
        <Box sx={{ marginTop: 1 }}>
          <TextField
            disabled
            multiline
            fullWidth
            value={invitationCode}
            maxRows={3}
          />
        </Box>
      )}

      {pin && (
        <Box sx={{ marginTop: 1 }}>
          <TextField
            disabled
            type='text'
            value={pin}
          />
        </Box>
      )}
    </Box>
  );
};

/**
 * Processes device invitations/authentication.
 */
const HaloAuthenticationContainer = () => {
  const client = useClient();
  const [status, setStatus] = useState<any>({});
  const [secretProvider, secretResolver] = useProvider<Buffer>();

  const handleSubmit = async (invitationCode: string) => {
    try {
      const invitation = decodeInvitation(invitationCode);

      // Create an invitation for this device to join an existing Halo.
      if (invitation.identityKey) {
        await client.echo.halo.join(invitation, secretProvider);
        setStatus({ identity: invitation.identityKey.toString() });
      }
    } catch (err) {
      // TODO(burdon): Doesn't support retry. Provide hint (e.g., should retry/cancel).
      setStatus({ error: err });
    }
  };

  const handleAuthenticate = (pin: string) => {
    secretResolver(Buffer.from(pin));
  };

  return (
    <RedeemInvitationPanel
      status={status}
      onSubmit={handleSubmit}
      onAuthenticate={handleAuthenticate}
    />
  );
};

const TestApp = () => {
  const client = useClient();
  const parties = useParties();
  const profile = useProfile();

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      flexShrink: 0,
      overflow: 'hidden',
      margin: 1
    }}>
      <Paper>
        <ClientPanel client={client} profile={profile} parties={parties} />
        <Divider/>
        <HaloInvitationContainer/>
        {!client.echo.halo.isInitialized && (
          <>
            <Divider/>
            <HaloAuthenticationContainer/>
          </>
        )}
      </Paper>
    </Box>
  );
};

export const Primary = () => {
  // Configure in-memory swarm.
  const config = { swarm: { signal: undefined } };
  const peers = 2;

  return (
    <Container>
      <Box sx={{ display: 'flex', flex: 1, padding: 1, justifyContent: 'space-around' }}>
        {/* Instantiated Client */}
        <ClientInitializer config={config}>
          <ProfileInitializer>
            <TestApp/>
          </ProfileInitializer>
        </ClientInitializer>

        {/* Joiners */}
        {[...new Array(peers)].map((_, i) => (
          <ClientInitializer key={i} config={config}>
            <TestApp/>
          </ClientInitializer>
        ))}
      </Box>
    </Container>
  );
};
