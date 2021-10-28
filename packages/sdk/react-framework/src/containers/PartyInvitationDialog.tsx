//
// Copyright 2020 DXOS.org
//

import { Button, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import { Box } from '@mui/system';
import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { encodeInvitation, useClient, useParty, useSecretGenerator } from '@dxos/react-client';
import { CopyText, CustomizableDialog, CustomizableDialogProps } from '@dxos/react-components';

import { MemberList } from '../components';
import { useMembers } from '../hooks';
import { DialogProps } from './DialogProps';

enum PartyInvitationState {
  INIT,
  INVITING,
  ERROR,
}

export interface PartyInvitationDialogStateResult {
  reset: () => void,
  state: PartyInvitationState
  dialogProps: CustomizableDialogProps
}

export interface PartyInvitationDialogStateProps extends DialogProps {
  partyKey?: PublicKey
}

/**
 * Manages the workflow for inviting a user to a party.
 */
export const usePartyInvitationDialogState = ({
  partyKey,
  closeOnSuccess,
  open,
  onClose
}: PartyInvitationDialogStateProps): PartyInvitationDialogStateResult => {
  const [state, setState] = useState<PartyInvitationState>(PartyInvitationState.INIT);
  // TODO(burdon): Multiple invitations at once (show useMembers).
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretGenerator();
  const [error, setError] = useState<string | undefined>(undefined);
  const client = useClient();
  const party = useParty(partyKey);
  const members = useMembers(party!);

  const handleReset = () => {
    setError(undefined);
    setInvitationCode(undefined);
    resetPin();
    setState(PartyInvitationState.INIT);
  };

  const handleCancel = () => {
    setState(PartyInvitationState.INIT);
    onClose?.();
  };

  const handleDone = () => {
    if (closeOnSuccess) {
      setState(PartyInvitationState.INIT);
      onClose?.();
    } else {
      handleReset();
    }
  };

  useEffect(() => {
    if (state === PartyInvitationState.INIT) {
      handleReset();
    }
  }, [state]);

  useEffect(() => {
    setState(PartyInvitationState.INIT);
  }, [partyKey]);

  const handleCreateInvitation = () => {
    setState(PartyInvitationState.INVITING);
    setImmediate(async () => {
      // TODO(burdon): Handle offline (display members).
      const invitation = await client.createInvitation(partyKey!, secretProvider, {
        onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
          handleDone();
        }
      });

      setInvitationCode(encodeInvitation(invitation));
    });
  };

  const getDialogProps = () => {
    const sharePartyContent = () => (
      <>
        <Button onClick={handleCreateInvitation}>Create Invitation</Button>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                <CopyText value={invitationCode} length={4} />
              </TableCell>
              <TableCell sx={{ width: 0 }}>
                <CopyText id='party-invitation-dialog-pin' value={pin} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Box m={1}>
          <Typography>Members</Typography>
          <MemberList members={members} />
        </Box>
      </>
    );

    const sharePartyActions = () => (
      <>
        <Button onClick={handleCancel}>{state === PartyInvitationState.INIT ? 'Close' : 'Cancel'}</Button>
      </>
    );

    const errorActions = () => (
      <Button onClick={handleReset}>Retry</Button>
    );

    switch (state) {
      case PartyInvitationState.INIT:
      case PartyInvitationState.INVITING: {
        return {
          open: !!open,
          title: 'Share Party',
          processing: !!pin,
          content: sharePartyContent,
          actions: sharePartyActions
        };
      }

      case PartyInvitationState.ERROR: {
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

  return { state, dialogProps: getDialogProps(), reset: handleReset };
};

// TODO(burdon): Replace ShareDialog
export const PartyInvitationDialog = (props: DialogProps) => {
  const { dialogProps } = usePartyInvitationDialogState(props);

  return (
    <CustomizableDialog {...dialogProps} />
  );
};
