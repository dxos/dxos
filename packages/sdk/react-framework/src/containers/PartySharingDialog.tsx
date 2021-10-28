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

/**
 * Manages the workflow for inviting a user to a party.
 */
export const PartySharingDialog = ({
  open,
  modal,
  onClose,
  partyKey
}: PartyInvitationDialogProps) => {
  const [state, setState] = useState(PartyInvitationState.INIT);
  const [error, setError] = useState<string | undefined>(undefined); // TODO(burdon): Error handling.

  // TODO(burdon): Multiple invitations at once (see Braneframe PartySharingDialog). Timeouts, etc.
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretGenerator();

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
          handleReset();
        }
      });

      setInvitationCode(encodeInvitation(invitation));
    });
  };

  const getDialogProps = (state: PartyInvitationState) => {
    const sharePartyContent = () => (
      <>
        <Box>
          <Button onClick={handleCreateInvitation}>Create Invitation</Button>
        </Box>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell>
                {!pin && (
                  <CopyText value={invitationCode} length={8} />
                )}
                {pin && (
                  <CopyText value={pin} />
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Box sx={{ marginTop: 2 }}>
          {/* TODO(burdon): Invite from address book. */}
          <MemberList members={members} />
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
          title: 'Party Sharing',
          processing: !!pin,
          content: sharePartyContent,
          actions: sharePartyActions
        };
      }

      case PartyInvitationState.ERROR: {
        return {
          title: 'Party Sharing',
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
