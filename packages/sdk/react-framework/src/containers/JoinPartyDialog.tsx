//
// Copyright 2020 DXOS.org
//

import {
  Button,
  TextField,
  Typography
} from '@mui/material';
import React, { useState } from 'react';

import { decodeInvitation, useClient, useSecretProvider } from '@dxos/react-client';
import { Dialog } from '@dxos/react-components';

import { handleKey } from '../helpers';

enum PartyJoinState {
  INIT,
  AUTHENTICATE,
  ERROR
}

export interface PartyJoinDialogProps {
  open: boolean
  modal?: boolean
  onClose?: () => void
  closeOnSuccess?: boolean
}

/**
 * Manages joining HALO and parties.
 */
// TODO(burdon): Make work for HALO (device invitations).
export const JoinPartyDialog = ({
  modal,
  open,
  onClose,
  closeOnSuccess = true
}: PartyJoinDialogProps) => {
  const [state, setState] = useState(PartyJoinState.INIT);
  const [error, setError] = useState<string | undefined>(undefined);
  const [processing, setProcessing] = useState<boolean>(false);
  const [invitationCode, setInvitationCode] = useState('');

  const [secretProvider, secretResolver] = useSecretProvider<Buffer>();
  const [pin, setPin] = useState('');
  const client = useClient();

  const handleReset = () => {
    setError(undefined);
    setProcessing(false);
    setInvitationCode('');
    setPin('');
    setState(PartyJoinState.INIT);
  };

  const handleCancel = () => {
    handleReset();
    onClose?.();
  };

  const handleDone = () => {
    handleReset();
    if (closeOnSuccess) {
      onClose?.();
    }
  };

  const handleProcessInvitation = async () => {
    const invitation = decodeInvitation(invitationCode);
    setState(PartyJoinState.AUTHENTICATE);

    try {
      const party = await client.echo.joinParty(invitation, secretProvider);
      await party.open();
    } catch (err) {
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
          title: 'Authenticate Invitation',
          content: authenticateContent,
          actions: authenticateActions
        };
      }

      case PartyJoinState.ERROR: {
        return {
          title: 'Invitation Failed',
          error,
          actions: errorActions
        };
      }

      default: {
        return {};
      }
    }
  };

  const dialogProps = getDialogProps(state);

  return (
    <Dialog
      modal={modal}
      open={open}
      {...dialogProps}
    />
  );
};
