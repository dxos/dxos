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

import { DialogProps } from './DialogProps';

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

export interface usePartyJoinDialogStateProps extends DialogProps {
  initialState?: PartyJoinState,
}

export interface usePartyJoinDialogStateResult {
  dialogProps: CustomizableDialogProps,
  state: PartyJoinState,
  reset: () => void,
}

/**
 * Manages the workflow for joining a party using an invitation code.
 */
export const usePartyJoinDialogState = ({ initialState = PartyJoinState.INIT, open, onClose }: usePartyJoinDialogStateProps): usePartyJoinDialogStateResult => {
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
  };

  const handleCancel = () => {
    setState(PartyJoinState.INIT);
    onClose?.();
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
          open: !!open,
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
              <Button onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleProcessInvitation}>Process</Button>
            </>
            );
          }
        };
      }

      case PartyJoinState.AUTHENTICATE: {
        return {
          open: !!open,
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
              <Button onClick={handleCancel}>Cancel</Button>
              <Button onClick={handleAuthenticate}>Submit</Button>
            </>
            );
          }
        };
      }

      case PartyJoinState.DONE: {
        return {
          open: !!open,
          title: 'Joined Party',
          content: function JoinedPartyContent () {
            return (
            <>
              <Typography variant='body1' gutterBottom>
                Successfully joined invitation to a party!
              </Typography>
            </>
            );
          },
          actions: function JoinedPartyActions () {
            return (
            <>
              <Button onClick={handleCancel}>OK</Button>
            </>
            );
          }
        };
      }

      default: {
        return {
          open: !!open
        };
      }
    }
  };

  return { state, dialogProps: getDialogProps(state), reset: handleReset };
};

// TODO(burdon): Replace RedeemDialog
export const PartyJoinDialog = (props: DialogProps) => {
  const { dialogProps } = usePartyJoinDialogState(props);

  return (
    <CustomizableDialog {...dialogProps} />
  );
};
