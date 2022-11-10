//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { Box, Button, TextField, Typography } from '@mui/material';

import { Party, InvitationEncoder } from '@dxos/client';
import type { SecretProvider } from '@dxos/credentials';
// import { useSecretProvider } from '@dxos/react-client';
import { Dialog, HashIcon, Passcode } from '@dxos/react-components';

import { handleKey } from '../../helpers';

const invitationCodeFromUrl = (text: string) => text.substring(text.lastIndexOf('/') + 1);

enum PartyJoinState {
  INIT,
  AUTHENTICATE,
  ERROR
}

type JoinOptions = {
  invitation: InvitationEncoder;
  secretProvider: SecretProvider;
};

export interface JoinDialogProps {
  open: boolean;
  title: string;
  invitationCode?: string;
  onJoin: (joinOptions: JoinOptions) => Promise<Party | void>;
  onClose?: () => void;
  closeOnSuccess?: boolean;
  modal?: boolean;
}

/**
 * Manages joining HALO and parties.
 * Not exported for the end user.
 * See JoinPartyDialog and JoinHaloDialog.
 * @deprecated
 */
export const JoinDialog = ({
  open,
  invitationCode: initialCode,
  title,
  onJoin,
  onClose,
  closeOnSuccess = true,
  modal
}: JoinDialogProps) => {
  const [state, setState] = useState(initialCode ? PartyJoinState.AUTHENTICATE : PartyJoinState.INIT);
  const [error, setError] = useState<string | undefined>(undefined);
  const [processing, setProcessing] = useState<boolean>(false);
  const [invitationCode, setInvitationCode] = useState(initialCode || '');
  // const [secretProvider, secretResolver, resetSecret] = useSecretProvider<Buffer>();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setError(undefined);
    setProcessing(false);
    setInvitationCode('');
    // resetSecret();
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

  const handleProcessInvitation = async (text: string) => {
    if (!text.length) {
      return;
    }

    // let invitation: InvitationEncoder;
    try {
      // Parse URL.
      // const invitationCode = invitationCodeFromUrl(text);
      // invitation = InvitationEncoder.decode(invitationCode);
    } catch (err: any) {
      setError('Invalid invitation code.');
      setState(PartyJoinState.ERROR);
      return;
    }

    try {
      setState(PartyJoinState.AUTHENTICATE);
      // await onJoin({ invitation, secretProvider });
    } catch (err: any) {
      // TODO(burdon): The client package should only throw errors with user-facing messages.
      const parseError = (err: any) => {
        const messages: { [index: string]: string } = {
          ERR_EXTENSION_RESPONSE_FAILED: 'Authentication failed. Please try again.',
          ERR_GREET_ALREADY_CONNECTED_TO_SWARM: 'Already a member of the party.'
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
    // secretResolver(Buffer.from(pin));
  };

  useEffect(() => {
    if (initialCode) {
      void handleProcessInvitation(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    // TODO(burdon): The paste event only seems to be called the first time.
    // https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
    const pasteListener = (event: any) => {
      const invitationCode = event.clipboardData.getData('text');
      setInvitationCode(invitationCode);
      void handleProcessInvitation(invitationCode);
      event.preventDefault();
    };

    inputRef.current?.addEventListener('paste', pasteListener);
    return () => {
      inputRef.current?.removeEventListener('paste', pasteListener);
    };
  }, []);

  const getDialogProps = (state: PartyJoinState) => {
    const joinPartyContent = (
      <TextField
        id='join-dialog-invitation-code'
        ref={inputRef}
        autoFocus
        fullWidth
        placeholder='Paste the invitation code or URL.'
        spellCheck={false}
        value={invitationCode}
        onChange={(event) => setInvitationCode(event.target.value)}
        onKeyDown={handleKey('Enter', () => handleProcessInvitation(invitationCode))}
      />
    );

    const joinPartyActions = (
      <>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={() => handleProcessInvitation(invitationCode)}>Accept</Button>
      </>
    );

    const authenticateContent = (
      <>
        <Typography variant='body1'>Enter the passcode.</Typography>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: 3
          }}
        >
          <Passcode length={4} onSubmit={(value) => handleAuthenticate(value)} />
          <HashIcon sx={{ marginLeft: 2 }} size='large' value={invitationCodeFromUrl(invitationCode)} />
        </Box>
      </>
    );

    const authenticateActions = <Button onClick={handleCancel}>Cancel</Button>;

    const errorActions = (
      <>
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={handleReset}>Retry</Button>
      </>
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

  return <Dialog maxWidth='xs' modal={modal} open={open} {...dialogProps} />;
};
