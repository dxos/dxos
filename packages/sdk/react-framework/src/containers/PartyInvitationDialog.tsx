//
// Copyright 2020 DXOS.org
//

import { Button, Table, TableBody, TableCell, TableRow } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { encodeInvitation, useClient, useSecretGenerator } from '@dxos/react-client';
import { CopyText, CustomizableDialog, CustomizableDialogProps } from '@dxos/react-components';

import { DialogProps } from './DialogProps';

enum PartyInvitationState {
  INIT,
  ERROR,
  DONE
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
  open
}: PartyInvitationDialogStateProps): PartyInvitationDialogStateResult => {
  const [state, setState] = useState<PartyInvitationState>(PartyInvitationState.INIT);
  // TODO(burdon): Multiple invitations at once (show useMembers).
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretGenerator();
  const [error, setError] = useState<string | undefined>(undefined);
  const client = useClient();

  const handleReset = () => {
    setError(undefined);
    setInvitationCode(undefined);
    resetPin();
    setState(PartyInvitationState.INIT);
  };

  const handleCancel = () => setState(PartyInvitationState.DONE);

  const handleDone = () => closeOnSuccess ? setState(PartyInvitationState.DONE) : handleReset();

  useEffect(() => {
    if (state === PartyInvitationState.INIT) {
      handleReset();
    }
  }, [state]);

  useEffect(() => {
    setState(PartyInvitationState.INIT);
  }, [partyKey]);

  const handleCreateInvitation = () => {
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

  const getDialogProps = (state: PartyInvitationState) => {
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
                <CopyText value={pin} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </>
    );

    const sharePartyActions = () => (
      <>
        <Button onClick={handleCancel}>Cancel</Button>
      </>
    );

    const errorActions = () => (
      <Button onClick={handleReset}>Retry</Button>
    );

    switch (state) {
      case PartyInvitationState.INIT: {
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

  return { state, dialogProps: getDialogProps(state), reset: handleReset };
};

// TODO(burdon): Replace ShareDialog
export const PartyInvitationDialog = (props: DialogProps) => {
  const { dialogProps } = usePartyInvitationDialogState(props);

  return (
    <CustomizableDialog {...dialogProps} />
  );
};
