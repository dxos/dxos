//
// Copyright 2020 DXOS.org
//

import { Button, Table, TableBody, TableCell, TableRow } from '@mui/material';
import { Box } from '@mui/system';
import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { encodeInvitation, useClient, useParty, useSecretGenerator } from '@dxos/react-client';
import { CopyText, CustomizableDialog, MemberList } from '@dxos/react-components';

import { useMembers } from '../hooks';

enum PartyInvitationState {
  INIT,
  ERROR,
}

export interface PartyInvitationDialogProps {
  open: boolean
  modal?: boolean
  onClose?: () => void
  partyKey?: PublicKey
}

// TODO(burdon): Evolve this into PartySharingDialog.

/**
 * Manages the workflow for inviting a user to a party.
 */
export const PartyInvitationDialog = ({
  open,
  modal,
  onClose,
  partyKey
}: PartyInvitationDialogProps) => {
  const [state, setState] = useState(PartyInvitationState.INIT);
  // TODO(burdon): Multiple invitations at once (show useMembers). Timeout, etc.
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretGenerator();
  const [error, setError] = useState<string | undefined>(undefined); // TODO(burdon): Error handling.
  const client = useClient();
  const party = useParty(partyKey);
  const members = useMembers(party!);

  const handleReset = () => {
    setError(undefined);
    setInvitationCode(undefined);
    resetPin();
    setState(PartyInvitationState.INIT);
  };

  const handleDone = () => {
    handleReset();
    onClose?.();
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
    setImmediate(async () => {
      // TODO(burdon): Handle offline (display members).
      const invitation = await client.createInvitation(partyKey!, secretProvider, {
        onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
          // TODO(burdon): Update state.
          resetPin();
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
                <CopyText id='party-invitation-dialog-pin' value={pin} />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Box p={1}>
          <MemberList members={members} onShare={() => {}}/>
        </Box>
      </>
    );

    const sharePartyActions = () => (
      <>
        <Button onClick={handleDone}>Close</Button>
      </>
    );

    const errorActions = () => (
      <Button onClick={handleReset}>Retry</Button>
    );

    switch (state) {
      case PartyInvitationState.INIT: {
        return {
          title: 'Share Party',
          processing: !!pin,
          content: sharePartyContent,
          actions: sharePartyActions
        };
      }

      case PartyInvitationState.ERROR: {
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
    <CustomizableDialog
      open={open}
      modal={modal}
      {...dialogProps}
    />
  );
};
