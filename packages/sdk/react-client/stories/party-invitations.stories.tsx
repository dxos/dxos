//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import {
  Box, Button, Divider, Paper, TextField, Toolbar
} from '@mui/material';

import { InvitationDescriptor, PartyInvitation } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { useAsyncEffect } from '@dxos/react-async';

import {
  ClientProvider,
  useClient,
  useContacts,
  useParties,
  useProfile
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

// code debug.enable('dxos:*');

/**
 * Creates party and invitations.
 */
const PartyInvitationContainer = () => {
  const client = useClient();
  const [partyKey, setPartyKey] = useState<PublicKey>();
  const [invitationCode, setInvitationCode] = useState<string>();
  const [contact, setContact] = useState<string>();
  const contacts = useContacts();
  const [pin, setPin] = useState('');

  const resetInvitations = () => {
    setInvitationCode('');
    setPin('');
  };

  const handleCreateParty = () => {
    setTimeout(async () => {
      const party = await client.echo.createParty();
      setPartyKey(party.key);
      resetInvitations();
    });
  };

  const handleCreateInvitation = () => {
    setTimeout(async () => {
      resetInvitations();

      const invitation = await client.echo.getParty(partyKey!)!.createInvitation({
        inviteeKey: contact ? PublicKey.fromHex(contact!) : undefined
      });
      invitation.finished.on(() => resetInvitations());

      if (!contact) {
        invitation.connected.on(() => setPin(invitation.secret.toString()));
      }

      setInvitationCode(invitation.descriptor.encode());
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

interface Status {
  error?: any
  party?: string
  invitation?: PartyInvitation
}

/**
 * Processes party invitations.
 */
const PartyJoinContainer = () => {
  const client = useClient();
  const [status, setStatus] = useState<Status>({});

  const handleSubmit = async (invitationCode: string) => {
    setStatus({});

    try {
      const invitation = await client.echo.acceptInvitation(InvitationDescriptor.decode(invitationCode));
      setStatus({ invitation });

      const party = await invitation.getParty();
      setStatus({ party: party.key.toHex() });
    } catch (err: any) {
      setStatus({ error: err });
    }
  };

  const handleAuthenticate = async (pin: string) => {
    await status.invitation?.authenticate(Buffer.from(pin));
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

  useAsyncEffect(async () => {
    if (!profile) {
      await client.halo.createProfile();
    }
  }, []);

  if (!profile) {
    return null;
  }

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
        <PartyInvitationContainer />
        <Divider />
        <PartyJoinContainer />
      </Paper>
    </Box>
  );
};

export const Primary = () => {
  const peers = 3;

  return (
    <Container>
      <Box sx={{ display: 'flex', flex: 1, padding: 1, justifyContent: 'space-around' }}>
        {[...new Array(peers)].map((_, i) => (
          <ClientProvider key={i}>
            <TestApp />
          </ClientProvider>
        ))}
      </Box>
    </Container>
  );
};
