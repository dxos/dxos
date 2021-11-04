//
// Copyright 2020 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Button, Table, TableBody, TableCell, TableRow } from '@mui/material';
import { Box } from '@mui/system';

import { PublicKey } from '@dxos/crypto';
import { encodeInvitation, useClient, useParty, useSecretGenerator, useMembers } from '@dxos/react-client';
import { CopyText, CopyToClipboard, Dialog, MemberList, Passcode } from '@dxos/react-components';
import { HALO, InvitationOptions } from '@dxos/echo-db';

enum InvitationState {
  INIT,
  ERROR,
}

export interface SharingDialogProps {
  open: boolean
  modal?: boolean
  onClose?: () => void
  partyKey?: PublicKey,
  title: string,
  type: 'party' | 'halo'
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
  partyKey,
  title,
  type
}: SharingDialogProps) => {
  const [state, setState] = useState(InvitationState.INIT);
  const [error, setError] = useState<string | undefined>(undefined); // TODO(burdon): Error handling.

  // TODO(burdon): Multiple invitations at once (see Braneframe PartySharingDialog). Timeouts, etc.
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretGenerator();

  const client = useClient();
  const party = useParty(partyKey);
  const members = useMembers(party);

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

  useEffect(() => {
    setState(InvitationState.INIT);
  }, [partyKey]);

  const handleCreateInvitation = () => {
    setImmediate(async () => {
      const options: InvitationOptions = {
        onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
          handleReset();
        }
      }
      if (type === 'party') {
        // TODO(burdon): Handle offline (display members).
        const invitation = await client.createInvitation(partyKey!, secretProvider, options);
        setInvitationCode(encodeInvitation(invitation));
      } else if (type === 'halo') {
        const invitation = await client.createHaloInvitation(secretProvider, options)
        setInvitationCode(encodeInvitation(invitation));
      } else {
        throw new Error(`Unsupported invitation type: "${type}"`)
      }
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
