//
// Copyright 2021 DXOS.org
//

import {
  Box, Button, Divider, Paper, TextField, Toolbar
} from '@mui/material';
import React, { useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { InvitationDescriptorType } from '@dxos/echo-db';

import {
  ClientInitializer,
  decodeInvitation,
  encodeInvitation,
  ProfileInitializer,
  useClient,
  useContacts,
  useParties,
  useProfile,
  useSecretGenerator,
  useSecretProvider
} from '../src';
import {
  ClientPanel,
  ContactsSelector,
  Container,
  PartyJoinPanel
} from './helpers';

export default {
  title: 'react-client/Party Invitations'
};

// debug.enable('dxos:*');

/**
 * Creates party and invitations.
 */
const PartyInviatationContainer = () => {
  const client = useClient();
  const [partyKey, setPartyKey] = useState<PublicKey>();
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretGenerator();
  const [contact, setContact] = useState<string>();
  const [contacts] = useContacts();

  const handleCreateParty = () => {
    setImmediate(async () => {
      const party = await client.echo.createParty();
      setPartyKey(party.key);
      setInvitationCode('');
      resetPin();
    });
  };

  const handleCreateInvitation = () => {
    setImmediate(async () => {
      const invitation = (contact)
        ? await client.createOfflineInvitation(partyKey!, PublicKey.fromHex(contact!))
        : await client.createInvitation(partyKey!, secretProvider, {
          onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
            setInvitationCode(undefined);
          }
        });

      setInvitationCode(encodeInvitation(invitation));
    });
  };

  return (
    <Box>
      <Box sx={{ padding: 1 }}>
        <Toolbar>
          <Button
            variant='outlined'
            onClick={handleCreateParty}
          >
            Create Party
          </Button>
          <Button
            disabled={!partyKey}
            onClick={handleCreateInvitation}
          >
            Create Invitation
          </Button>
        </Toolbar>

        {contacts.length !== 0 && (
          <Box sx={{ marginTop: 1 }}>
            <ContactsSelector
              contacts={contacts}
              selected={contact}
              onSelect={setContact}
            />
          </Box>
        )}

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
    </Box>
  );
};

/**
 * Processes party invitations.
 */
const PartyJoinContainer = () => {
  const client = useClient();
  const [status, setStatus] = useState({});
  const [secretProvider, secretResolver] = useSecretProvider<Buffer>();

  const handleSubmit = async (invitationCode: string) => {
    setStatus({});

    try {
      const invitation = decodeInvitation(invitationCode);
      const offline = invitation.type === InvitationDescriptorType.OFFLINE_KEY;
      const party = await client.echo.joinParty(invitation, offline ? undefined : secretProvider);
      await party.open();

      setStatus({ party: party.key.toHex() });
    } catch (error) {
      setStatus({ error });
    }
  };

  const handleAuthenticate = (pin: string) => {
    secretResolver(Buffer.from(pin));
  };

  return (
    <PartyJoinPanel
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
        <Divider />
        <PartyInviatationContainer/>
        <Divider />
        <PartyJoinContainer/>
      </Paper>
    </Box>
  );
};

export const Primary = () => {
  // Configure in-memory swarm.
  const config = { swarm: { signal: undefined } };
  const peers = 3;

  return (
    <Container>
      <Box sx={{ display: 'flex', flex: 1, padding: 1, justifyContent: 'space-around' }}>
        {[...new Array(peers)].map((_, i) => (
          <ClientInitializer key={i} config={config}>
            <ProfileInitializer>
              <TestApp/>
            </ProfileInitializer>
          </ClientInitializer>
        ))}
      </Box>
    </Container>
  );
};
