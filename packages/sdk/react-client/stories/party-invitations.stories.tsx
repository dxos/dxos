//
// Copyright 2021 DXOS.org
//

import React, { useState } from 'react';

import {
  Box, Button, Divider, Paper, TextField, Toolbar
} from '@mui/material';

import { encodeInvitation, decodeInvitation, PendingInvitation, Client } from '@dxos/client';
import { PublicKey } from '@dxos/crypto';
import { InvitationDescriptorType } from '@dxos/echo-db';

import {
  ClientProvider,
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

// code debug.enable('dxos:*');

/**
 * Creates party and invitations.
 */
const PartyInvitationContainer = () => {
  const client = useClient();
  const [partyKey, setPartyKey] = useState<PublicKey>();
  const [invitation, setInvitation] = useState<PendingInvitation | undefined>();
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretGenerator();
  const [contact, setContact] = useState<string>();
  const [contacts] = useContacts();

  const resetInvitations = () => {
    setInvitationCode('');
    setInvitation(undefined);
  }

  const handleCreateParty = () => {
    setImmediate(async () => {
      const party = await client.echo.createParty();
      setPartyKey(party.key);
      resetInvitations();
      resetPin();
    });
  };

  // const handleCreateInvitation = async () => {
  //   const invitation = await client.createHaloInvitation({
  //     onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
  //       setInvitation(undefined);
  //       setPin('');
  //     },
  //     onPinGenerated: setPin
  //   });

  //   setInvitation(invitation);
  // };

  const handleCreateInvitation = () => {
    setImmediate(async () => {
      resetInvitations();
      if (contact) {
        const invitation = await client.echo.createOfflineInvitation(partyKey!, PublicKey.fromHex(contact!))
        setInvitationCode(encodeInvitation(invitation));
      } else {
        const invitation = await client.echo.createInvitation(partyKey!, {
          onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
            setInvitationCode(undefined);
            resetPin();
          }
        });
        setInvitation(invitation)
      }
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
  error?: any,
  party?: string,
  finishAuthentication?: Awaited<ReturnType<Client['echo']['acceptInvitation']>>
}

/**
 * Processes party invitations.
 */
const PartyJoinContainer = () => {
  const client = useClient();
  const [status, setStatus] = useState<Status>({});
  const [secretProvider, secretResolver] = useSecretProvider<Buffer>();

  const handleSubmit = async (invitationCode: string) => {
    setStatus({});

    try {
      const invitation = decodeInvitation(invitationCode);
      if (invitation.type === InvitationDescriptorType.OFFLINE_KEY) {
        const party = await client.echo.joinParty(invitation);
        await party.open();
        setStatus({ party: party.key.toHex() });
      } else {
        const finishAuthentication = await client.echo.acceptInvitation(invitation);
        setStatus({ finishAuthentication });
      }
      

    } catch (error: any) {
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
            <ProfileInitializer>
              <TestApp />
            </ProfileInitializer>
          </ClientProvider>
        ))}
      </Box>
    </Container>
  );
};
