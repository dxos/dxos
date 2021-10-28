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

// TODO(burdon): Move to react-components?
const handleKey = (key: string, callback: () => void) => (event: { key: string }) => {
  if (event.key === key) {
    callback();
  }
};

enum PartyJoinState {
  INIT,
  AUTHENTICATE,
  ERROR
}

export interface PartyJoinDialogStateResult {
  dialogProps: CustomizableDialogProps
  state: PartyJoinState
  reset: () => void
}

export interface PartyJoinDialogStateProps extends DialogProps {
  initialState?: PartyJoinState
}

/**
 * Manages the workflow for joining a party using an invitation code.
 */
export const usePartyJoinDialogState = ({
  initialState = PartyJoinState.INIT,
  closeOnSuccess,
  open,
  onClose
}: PartyJoinDialogStateProps): PartyJoinDialogStateResult => {
  const [state, setState] = useState<PartyJoinState>(initialState);
  const [invitationCode, setInvitationCode] = useState('');
  const [pin, setPin] = useState('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [secretProvider, secretResolver] = useSecretProvider<Buffer>();
  const [error, setError] = useState<string | undefined>(undefined);
  const client = useClient();

  const handleReset = () => {
    setError(undefined);
    setProcessing(false);
    setInvitationCode('');
    setPin('');
    setState(PartyJoinState.INIT);
  };

  const handleCancel = () => {
    setState(PartyJoinState.INIT);
    onClose?.();
  };

  const handleDone = () => {
    if (closeOnSuccess) {
      setState(PartyJoinState.INIT);
      onClose?.();
    } else {
      handleReset();
    }
  };

  useEffect(() => {
    if (state === PartyJoinState.INIT) {
      handleReset();
    }
  }, [state]);

  const handleProcessInvitation = async () => {
    const invitation = decodeInvitation(invitationCode);
    setState(PartyJoinState.AUTHENTICATE);

    try {
      const party = await client.echo.joinParty(invitation, secretProvider);
      await party.open();
    } catch (err) {
      console.log(err);
      setError(err.message);
      setState(PartyJoinState.ERROR);
      return;
    }

    handleDone();
  };

  const handleAuthenticate = () => {
    setProcessing(true);
    secretResolver(Buffer.from(pin));
  };

  const getDialogProps = (state: PartyJoinState) => {
    const joinPartyContent = () => (
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
    );

    const joinPartyActions = () => (
      <>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleProcessInvitation}>Process</Button>
      </>
    );

    const authenticateContent = () => (
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

    const authenticateActions = () => (
      <>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleAuthenticate}>Submit</Button>
      </>
    );

    const errorActions = () => (
      <Button onClick={handleReset}>Retry</Button>
    );

    switch (state) {
      case PartyJoinState.INIT: {
        return {
          open: !!open,
          title: 'Join Party',
          content: joinPartyContent,
          actions: joinPartyActions
        };
      }

      case PartyJoinState.AUTHENTICATE: {
        return {
          open: !!open,
          title: 'Authenticate',
          content: authenticateContent,
          actions: authenticateActions
        };
      }

      case PartyJoinState.ERROR: {
        return {
          open: !!open,
          title: 'Invitation Failed',
          error,
          actions: errorActions
        };
      }

      default: {
        return {
          open: false
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
