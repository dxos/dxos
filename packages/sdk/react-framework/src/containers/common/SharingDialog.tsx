//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button, Table, TableBody, TableCell, TableRow } from '@mui/material';
import { Box } from '@mui/system';

import type { SecretProvider } from '@dxos/credentials';
import { InvitationDescriptor, InvitationOptions, PartyMember } from '@dxos/echo-db';
import { encodeInvitation, useSecretGenerator } from '@dxos/react-client';
import { CopyText, CopyToClipboard, Dialog, MemberList, Passcode } from '@dxos/react-components';

enum InvitationState {
  INIT,
  ERROR,
}

type ShareOptions = {
  secretProvider: SecretProvider,
  options: InvitationOptions
}

export interface SharingDialogProps {
  open: boolean
  modal?: boolean
  onClose?: () => void
  onShare: (shareOptions: ShareOptions) => Promise<InvitationDescriptor>
  title: string,
  members?: PartyMember[] // TODO(rzadp): Support HALO members as well (different devices).
}

/**
 * Reusable sharing logic for inviting to a regular party and to a HALO party.
 * Not exported for the end user.
 * See PartySharingDialog and DeviceSharingDialog.
 * @param partyKey - The party key to invite to. Not applicable for HALO invitations.
 */
export const SharingDialog = ({
  open,
  modal,
  onClose,
  title,
  onShare,
  members = []
}: SharingDialogProps) => {
  const [state, setState] = useState(InvitationState.INIT);
  const [error, setError] = useState<string | undefined>(undefined); // TODO(burdon): Error handling.

  // TODO(burdon): Multiple invitations at once (see Braneframe PartySharingDialog). Timeouts, etc.
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretGenerator();

  const handleReset = () => {
    setError(undefined);
    setInvitationCode(undefined);
    resetPin();
    setState(InvitationState.INIT);
  };

  const handleDone = () => {
    handleReset();
    onClose?.();
  };

  useEffect(() => {
    if (state === InvitationState.INIT) {
      handleReset();
    }
  }, [state]);

  const handleCreateInvitation = () => {
    setImmediate(async () => {
      const options: InvitationOptions = {
        onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
          handleReset();
        }
      };
      const invitation = await onShare({ secretProvider, options });
      setInvitationCode(encodeInvitation(invitation));
    });
  };

  const getDialogProps = (state: InvitationState) => {
    const sharePartyContent = () => (
      <>
        <Box>
          <Button onClick={handleCreateInvitation}>Create Invitation</Button>
        </Box>
        <Table size='small'>
          <TableBody>
            <TableRow>
              <TableCell>
                {!pin && (
                  <CopyText value={invitationCode} length={8} onCopyToClipboard={(value) => console.log(value)} />
                )}
                {pin && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Passcode value={pin} size='small' />
                    <CopyToClipboard text={pin} />
                  </Box>
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
      case InvitationState.INIT: {
        return {
          title,
          processing: !!pin,
          content: sharePartyContent,
          actions: sharePartyActions
        };
      }

      case InvitationState.ERROR: {
        return {
          title,
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
      open={open}
      modal={modal}
      {...dialogProps}
    />
  );
};
