//
// Copyright 2020 DXOS.org
//

import {
  Button,
  TextField,
  Typography
} from '@mui/material';
import React, { useState } from 'react';

import { CustomizableDialogProps } from '@dxos/react-components';
import { decodeInvitation, useClient, useSecretProvider } from '@dxos/react-client';

//
// Hooks
//

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

// TODO(burdon): Factor out.
export const usePartyJoinDialogState = (initialState = PartyJoinState.INIT): [PartyJoinDialogState, () => void] => {
  const [state, setState] = useState<PartyJoinState>(initialState);
  const [invitationCode, setInvitationCode] = useState('');
  const [pin, setPin] = useState('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [secretProvider, secretResolver] = useSecretProvider<Buffer>();
  const client = useClient();

  const handleProcessInvitation = async () => {
    const invitation = decodeInvitation(invitationCode);
    setState(PartyJoinState.AUTHENTICATE);

    const party = await client.echo.joinParty(invitation, secretProvider);
    await party.open();

    setState(PartyJoinState.DONE);
  }

  const handleAuthenticate = () => {
    secretResolver(Buffer.from(pin));
  }

  const getDialogPropse = (state: PartyJoinState) => {
    switch (state) {
      case PartyJoinState.INIT: {
        return {
          open: true,
          title: 'Redeem Invitation',
          content: () => (
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
          ),
          actions: () => (
            <>
              <Button onClick={() => setState(PartyJoinState.CANCEL)}>Cancel</Button>
              <Button onClick={handleProcessInvitation}>Process</Button>
            </>
          )
        };
      }

      case PartyJoinState.AUTHENTICATE: {
        return {
          open: true,
          title: 'Authenticate',
          content: () => (
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
          ),
          actions: () => (
            <>
              <Button onClick={() => setState(PartyJoinState.CANCEL)}>Cancel</Button>
              <Button onClick={handleAuthenticate}>Submit</Button>
            </>
          )
        }
      }

      default: {
        return {
          open: false
        }
      }
    }
  };

  return [{ state, dialogProps: getDialogPropse(state) }, () => setState(PartyJoinState.INIT)];
};
