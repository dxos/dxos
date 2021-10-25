//
// Copyright 2020 DXOS.org
//

import {
  Button,
  TextField,
  Typography
} from '@mui/material';
import React, { useEffect, useState } from 'react';

import { decodeInvitation, useClient, useSecretProvider } from '@dxos/react-client';
import { CustomizableDialog, CustomizableDialogProps } from '@dxos/react-components';

// TODO(burdon): Util.
const handleKey = (key: string, callback: () => void) => (event: { key: string }) => {
  if (event.key === key) {
    callback();
  }
};

enum PartyJoinState {
  INIT,
  AUTHENTICATE,
  CANCEL,
  DONE
}

interface PartyJoinDialogState {
  state: PartyJoinState
  dialogProps: CustomizableDialogProps
}

/**
 * Manages the workflow for joining a party using an invitation code.
 */
export const usePartyJoinDialogState = (initialState = PartyJoinState.INIT): [PartyJoinDialogState, () => void] => {
  const [state, setState] = useState<PartyJoinState>(initialState);
  const [invitationCode, setInvitationCode] = useState('');
  const [pin, setPin] = useState('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [secretProvider, secretResolver] = useSecretProvider<Buffer>();
  const client = useClient();

  const handleReset = () => {
    setInvitationCode('');
    setPin('');
    setProcessing(false);
    setState(PartyJoinState.INIT);
  };

  useEffect(() => {
    if (state === PartyJoinState.INIT) {
      handleReset();
    }
  }, [state]);

  const handleProcessInvitation = async () => {
    const invitation = decodeInvitation(invitationCode);
    setState(PartyJoinState.AUTHENTICATE);

    const party = await client.echo.joinParty(invitation, secretProvider);
    await party.open();

    setState(PartyJoinState.DONE);
  };

  const handleAuthenticate = () => {
    setProcessing(true);
    secretResolver(Buffer.from(pin));
  };

  const getDialogProps = (state: PartyJoinState) => {
    switch (state) {
      case PartyJoinState.INIT: {
        return {
          open: true,
          title: 'Join Party',
          content: function JoinPartyContent () {
            return (
            <>
              <TextField
                autoFocus
                fullWidth
                multiline
                variant='standard'
                placeholder='Paste invitation code.'
                spellCheck={false}
                value={invitationCode}
                onChange={(event) => setInvitationCode(event.target.value)}
                onKeyDown={handleKey('Enter', handleProcessInvitation)}
                rows={6}
              />
            </>
            );
          },
          actions: function JoinPartyActions () {
            return (
            <>
              <Button onClick={() => setState(PartyJoinState.CANCEL)}>Cancel</Button>
              <Button onClick={handleProcessInvitation}>Process</Button>
            </>
            );
          }
        };
      }

      case PartyJoinState.AUTHENTICATE: {
        return {
          open: true,
          title: 'Authenticate',
          content: function AuthenticateContent () {
            return (
            <>
              <Typography variant='body1' gutterBottom>
                Enter the PIN number.
              </Typography>
              <TextField
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                variant='outlined'
                margin='normal'
                required
                fullWidth
                label='PIN Code'
                autoFocus
                disabled={processing}
                onKeyDown={handleKey('Enter', handleAuthenticate)}
              />
            </>
            );
          },
          actions: function AuthenticateActions () {
            return (
            <>
              <Button onClick={() => setState(PartyJoinState.CANCEL)}>Cancel</Button>
              <Button onClick={handleAuthenticate}>Submit</Button>
            </>
            );
          }
        };
      }

      default: {
        return {
          open: false
        };
      }
    }
  };

  return [{ state, dialogProps: getDialogProps(state) }, handleReset];
};

// TODO(burdon): Replace RedeemDialog
export const PartyJoinDialog = () => {
  const [{ dialogProps }/*, reset */] = usePartyJoinDialogState();

  return (
    <CustomizableDialog {...dialogProps} />
  );
};
