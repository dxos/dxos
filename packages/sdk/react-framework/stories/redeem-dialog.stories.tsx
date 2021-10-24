//
// Copyright 2021 DXOS.org
//

import { Box, Button } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { defaultInvitationAuthenticator, InvitationDescriptor } from '@dxos/echo-db';
import {
  encodeInvitation,
  useClient,
  useInvitationRedeemer,
  ClientInitializer,
  ProfileInitializer
} from '@dxos/react-client';
import { CopyText } from '@dxos/react-components';

import { FullScreen, RedeemDialog, RedeemDialogWithoutClient } from '../src';
import { useSecretProvider } from '@dxos/react-client/dist/stories/helpers';

export default {
  title: 'react-framework/RedeemDialog'
};

// TODO(burdon): Replace callbacks with model.

export const Primary = () => {
  const [open, setOpen] = useState(true);

  return (
    <FullScreen>
      <RedeemDialogWithoutClient
        open={open}

        onEnterInvitationCode={async (invitationCode: string) => {
          const match = invitationCode.match(/[a-z]+/g);
          if (!match) {
            return { error: new Error('Invalid code.') };
          }

          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(undefined);
            }, 3000);
          });
        }}

        onEnterPin={(pin: string) => {
          const match = pin.match(/[0-9]+/g);
          if (!match) {
            return { error: new Error('Invalid PIN.') };
          }
        }}

        onClose={() => setOpen(false)}
      />
    </FullScreen>
  );
};

const TestRedeemer = () => {
  const [open, setOpen] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');
  const [error, setError] = useState('');
  const [partyKey, setPartyKey] = useState<PublicKey>();
  const [secretProvider, pin, resetPin] = useSecretProvider();
  const client = useClient();

  const [redeemCode, setPin] = useInvitationRedeemer({
    onDone: () => setOpen(false),
    onError: (error?: string) => setError(String(error)),
    isOffline: false
  });

  // Create party.
  useEffect(() => {
    setImmediate(async () => {
      const party = await client.echo.createParty();
      setPartyKey(party.key);
      setInvitationCode('');
      resetPin();
    });
  }, []);

  useEffect(() => {
    void handleGenerateInvite();
  }, [partyKey]);

  const handleGenerateInvite = async () => {
    if (partyKey) {
      const invitation = await client.createInvitation(partyKey!, secretProvider, {
        onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
          setInvitationCode('');
        }
      });

      setInvitationCode(encodeInvitation(invitation));
    }
  };

  // TODO(burdon): Prevent click to cancel.
  return (
    <Box>
      <Box sx={{ padding: 1 }}>
        <Box sx={{ display: 'flex' }}>
          <Button variant='outlined' onClick={handleGenerateInvite}>Create Invitation</Button>
          <div style={{ paddingRight: 4 }} />
          <Button variant='outlined' onClick={() => setOpen(true)}>Open Dialog</Button>
        </Box>
        <Box sx={{ width: 400, padding: 1 }}>
          <CopyText sx={{ fontFamily: 'monospace' }} value={invitationCode} />
        </Box>
      </Box>

      <RedeemDialogWithoutClient
        open={open}

        // TODO(burdon): Error handling (try/catch).
        onEnterInvitationCode={async (invitationCode: string) => {
          console.log('::::::::::::', invitationCode);

          const party = await client.echo.joinParty(
            InvitationDescriptor.fromQueryParameters(JSON.parse(invitationCode)),
            defaultInvitationAuthenticator.secretProvider
          );

          await party.open();
        }}

        onEnterPin={(pin: string) => {
          setPin(pin);
        }}

        onClose={() => setOpen(false)}
      />
    </Box>
  );
};

export const Secondary = () => {
  return (
    <ClientInitializer>
      <ProfileInitializer>
        <FullScreen>
          <TestRedeemer />
        </FullScreen>
      </ProfileInitializer>
    </ClientInitializer>
  );
};

// TODO(burdon): Remove.
export const WithClient = () => {
  return (
    <ClientInitializer>
      <RedeemDialog
        open
        onClose={() => {
          console.log('OK');
        }}
      />
    </ClientInitializer>
  );
};
