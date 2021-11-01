//
// Copyright 2020 DXOS.org
//

import { Box, Button, TextField, Typography } from '@mui/material';
import React, { useState } from 'react';

import { decodeInvitation, useClient, useSecretProvider } from '@dxos/react-client';
import { Dialog, Passcode } from '@dxos/react-components';

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
  const client = useClient();

  const handleReset = () => {
    setError(undefined);
    setProcessing(false);
    setInvitationCode('');
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
    if (!invitationCode.length) {
      return;
    }

    let invitation;
    try {
      invitation = decodeInvitation(invitationCode);
      setState(PartyJoinState.AUTHENTICATE);
    } catch (err) {
      setError('Invalid invitation code.');
      setState(PartyJoinState.ERROR);
      return;
    }

    try {
      setState(PartyJoinState.AUTHENTICATE);
      const party = await client.echo.joinParty(invitation, secretProvider);
      await party.open();
    } catch (err) {
      // TODO(burdon): Extract human error (e.g., currently "Already connected to swarm").
      setError(err.responseMessage || err.message);
      setState(PartyJoinState.ERROR);
      return;
    }

    handleDone();
  };

  const handleAuthenticate = (pin: string) => {
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
        placeholder='Copy the invitation code.'
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
          Enter the PIN.
        </Typography>
        <Box sx={{ marginTop: 2 }}>
          <Passcode length={4} onSubmit={value => handleAuthenticate(value)} />
        </Box>
      </>
    );

    const authenticateActions = () => (
      <>
        <Button onClick={handleCancel}>Cancel</Button>
      </>
    );

    const errorActions = () => (
      <Button onClick={handleReset}>Retry</Button>
    );

    switch (state) {
      case PartyJoinState.INIT: {
        return {
          title: 'Join Party',
          processing,
          content: joinPartyContent,
          actions: joinPartyActions
        };
      }

      case PartyJoinState.AUTHENTICATE: {
        return {
          title: 'Authenticate Invitation',
          processing,
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
