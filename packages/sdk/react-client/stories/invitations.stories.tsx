//
// Copyright 2021 DXOS.org
//

import { Box, Button, Divider, Paper, TextField, Toolbar } from '@mui/material';
import React, { useState } from 'react';

import { trigger } from '@dxos/async';
import { generatePasscode } from '@dxos/credentials';
import { PublicKey } from '@dxos/crypto';

import {
  ClientInitializer, decodeInvitation,
  encodeInvitation,
  ProfileInitializer,
  useClient, useParties
} from '../src';
import { ClientPanel, JsonPanel, TestTheme } from './helpers';

export default {
  title: 'react-client/Invitations'
};

// debug.enable('dxos:*');

// TODO(burdon): Factor out.
const useSecretProvider = (): [() => Promise<Buffer>, string | undefined, () => void] => {
  const [pin, setPin] = useState<string>();

  const provider = () => {
    const pin = generatePasscode();
    setPin(pin);
    return Promise.resolve(Buffer.from(pin));
  };

  return [provider, pin, () => setPin('')];
};

// TODO(burdon): Factor out.
const useProvider = <T extends any> (): [() => Promise<T>, (value: T) => void] => {
  const [[provider, resolver]] = useState(() => trigger<T>());

  return [provider, resolver];
};

/**
 * Creates party and invitations.
 */
const InviatationPanel = () => {
  const client = useClient();
  const [partyKey, setPartyKey] = useState<PublicKey>();
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretProvider();

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
      const invitation = await client.createInvitation(partyKey!, secretProvider);
      setInvitationCode(encodeInvitation(invitation));
    });
  };

  return (
    <Box sx={{ padding: 1 }}>
      <Toolbar>
        <Button
          variant="outlined"
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

      {invitationCode && (
        <Box sx={{ marginTop: 1 }}>
          <TextField
            disabled
            multiline
            fullWidth
            defaultValue={invitationCode}
            maxRows={6}
          />
        </Box>
      )}
      {pin && (
        <Box sx={{ marginTop: 1 }}>
          <TextField
            disabled
            type="text"
            value={pin}
          />
        </Box>
      )}
    </Box>
  );
};

const RedeemInvitationPanel = (
  {
    status,
    onSubmit,
    onAuthenticate
  }: {
    status: any,
    onSubmit: (invitationCode: string) => void
    onAuthenticate: (pin: string) => void
  }
) => {
  const [invitationCode, setInvitationCode] = useState<string>('');
  const [pin, setPin] = useState<string>('');

  return (
    <Box sx={{ padding: 1 }}>
      <Box>
        <Toolbar>
          <Button
            onClick={() => onSubmit(invitationCode)}
            disabled={!invitationCode}
            variant="outlined"
          >
            Join Party
          </Button>
        </Toolbar>

        <Box sx={{ marginTop: 1 }}>
          <TextField
            multiline
            fullWidth
            value={invitationCode}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => {
              setInvitationCode(event.target.value);
              setPin('');
            }}
            maxRows={6}
          />
          {invitationCode && (
            <Box sx={{ display: 'flex', marginTop: 2 }}>
              <TextField
                // disabled={!invitationCode}
                value={pin}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPin(event.target.value)}
                // variant='standard'
                size="small"
                label="PIN"
              />
              <Button
                disabled={!pin}
                onClick={() => onAuthenticate(pin)}
              >
                Submit
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {(Object.keys(status).length > 0) && (
        <Box sx={{ marginTop: 1 }}>
          <JsonPanel value={status} />
        </Box>
      )}
    </Box>
  );
};

/**
 * Processes party invitations.
 */
const RedeemInvitationContainer = () => {
  const client = useClient();
  const [status, setStatus] = useState({});
  const [secretProvider, secretResolver] = useProvider<Buffer>();

  const handleSubmit = async (invitationCode: string) => {
    setStatus({});

    try {
      const invitation = decodeInvitation(invitationCode);
      const party = await client.echo.joinParty(invitation, secretProvider);
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

  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      flexShrink: 0,
      overflow: 'hidden',
      padding: 1
    }}>
      <Paper>
        <ClientPanel client={client} parties={parties}/>
        <Divider/>
        <InviatationPanel/>
        <Divider/>
        <RedeemInvitationContainer/>
      </Paper>
    </Box>
  );
};

export const MultipleClients = () => {
  // Configure in-memory swarm.
  const config = { swarm: { signal: undefined } };
  const peers = 3;

  return (
    <TestTheme>
      <Box sx={{
        display: 'flex',
        overflow: 'hidden'
      }}>
        {[...new Array(peers)].map((_, i) => (
          <ClientInitializer key={i} config={config}>
            <ProfileInitializer>
              <TestApp/>
            </ProfileInitializer>
          </ClientInitializer>
        ))}
      </Box>
    </TestTheme>
  );
};
