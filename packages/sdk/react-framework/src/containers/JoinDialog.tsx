//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { Box, Button, TextField, Typography } from '@mui/material';

import { decodeInvitation } from '@dxos/client';
import type { SecretProvider } from '@dxos/credentials';
import { InvitationDescriptor, Party } from '@dxos/echo-db';
import { useSecretProvider } from '@dxos/react-client';
import { Dialog, HashIcon, Passcode } from '@dxos/react-components';

import { handleKey } from '../helpers';

enum PartyJoinState {
  INIT,
  AUTHENTICATE,
  ERROR
}

type JoinOptions = {
  invitation: InvitationDescriptor
  secretProvider: SecretProvider
}

export interface JoinDialogProps {
  open: boolean
  title: string
  invitationCode?: string
  onJoin: (joinOptions: JoinOptions) => Promise<Party | void>
  onClose?: () => void
  closeOnSuccess?: boolean
  modal?: boolean
}

/**
 * Manages joining HALO and parties.
 * Not exported for the end user.
 * See JoinPartyDialog and JoinHaloDialog.
 */
// TODO(burdon): Move to components.
export const JoinDialog = ({
  open,
  invitationCode: initialCode, // TODO(burdon): Automatically go to next step if set.
  title,
  onJoin,
  onClose,
  closeOnSuccess = true,
  modal
}: JoinDialogProps) => {
  const [state, setState] = useState(PartyJoinState.INIT);
  const [error, setError] = useState<string | undefined>(undefined);
  const [processing, setProcessing] = useState<boolean>(false);
  const [invitationCode, setInvitationCode] = useState(initialCode || '');
  const [secretProvider, secretResolver] = useSecretProvider<Buffer>();

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

  const handleUpdateInvitationCode = (text: string) => {
    // Parse URL.
    const index = text.lastIndexOf('/');
    const invitationCode = text.substring(index + 1);
    setInvitationCode(invitationCode);
  };

  const handleProcessInvitation = async () => {
    if (!invitationCode.length) {
      return;
    }

    let invitation: InvitationDescriptor;
    try {
      invitation = decodeInvitation(invitationCode);
    } catch (err) {
      setError('Invalid invitation code.');
      setState(PartyJoinState.ERROR);
      return;
    }

    try {
      setState(PartyJoinState.AUTHENTICATE);
      await onJoin({ invitation, secretProvider });
    } catch (err: any) {
      // TODO(burdon): The client package should only throw errors with user-facing messages.
      const parseError = (err: any) => {
        const messages: {[index: string]: string} = {
          ERR_EXTENSION_RESPONSE_FAILED: 'Authentication failed.',
          ERR_GREET_ALREADY_CONNECTED_TO_SWARM: 'Already member of party.'
        };

        return messages[err.responseCode];
      };

      setError(parseError(err) || err.responseMessage || err.message);
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
    const joinPartyContent = (
      <TextField
        autoFocus
        fullWidth
        multiline
        variant='standard'
        placeholder='Copy the invitation code or URL.'
        spellCheck={false}
        value={invitationCode}
        onChange={(event) => handleUpdateInvitationCode(event.target.value)}
        onKeyDown={handleKey('Enter', handleProcessInvitation)}
        rows={6}
      />
    );

    const joinPartyActions = (
      <>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleProcessInvitation}>Process</Button>
      </>
    );

    const authenticateContent = (
      <>
        <Typography variant='body1'>
          Enter the PIN.
        </Typography>
        <Box sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: 3
        }}
        >
          <Passcode
            length={4}
            onSubmit={value => handleAuthenticate(value)}
          />
          <HashIcon
            sx={{ marginLeft: 2 }}
            size='large'
            value={invitationCode}
          />
        </Box>
      </>
    );

    const authenticateActions = (
      <Button onClick={handleCancel}>Cancel</Button>
    );

    const errorActions = (
      <Button onClick={handleReset}>Retry</Button>
    );

    switch (state) {
      case PartyJoinState.INIT: {
        return {
          title,
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
      maxWidth='xs'
      modal={modal}
      open={open}
      {...dialogProps}
    />
  );
};
