//
// Copyright 2020 DXOS.org
//

import { Button, Table, TableBody, TableCell, TableRow } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { CopyText, CustomizableDialog, CustomizableDialogProps } from '@dxos/react-components';
import { encodeInvitation, useClient, useSecretGenerator } from '@dxos/react-client';

enum PartyInvitationState {
  INIT,
  CANCEL,
  DONE
}

interface PartyInvitationDialogState {
  state: PartyInvitationState
  dialogProps: CustomizableDialogProps
}

/**
 * Manages the workflow for inviting a user to a party.
 */
export const usePartyInvitationDialogState = (partyKey?: PublicKey): [PartyInvitationDialogState, () => void] => {
  const [state, setState] = useState<PartyInvitationState>(PartyInvitationState.INIT);
  // TODO(burdon): Multiple invitations at once (show useMembers).
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretGenerator();
  const client = useClient();

  useEffect(() => {
    handleReset();
  }, [partyKey]);

  useEffect(() => {
    if (state === PartyInvitationState.INIT) {
      handleReset();
    }
  }, [state])

  const handleReset = () => {
    resetPin();
    setInvitationCode(undefined);
    setState(PartyInvitationState.INIT);
  }

  const handleCreateInvitation = () => {
    setImmediate(async () => {
      // TODO(burdon): Handle offline (display members).
      const invitation = await client.createInvitation(partyKey!, secretProvider, {
        onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
          setState(PartyInvitationState.DONE);
        }
      });

      setInvitationCode(encodeInvitation(invitation));
    });
  };

  const getDialogProps = (state: PartyInvitationState) => {
    switch (state) {
      case PartyInvitationState.INIT: {
        return {
          open: true,
          title: 'Share Party',
          processing: !!pin,
          content: () => (
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
          ),
          actions: () => (
            <>
              <Button onClick={() => setState(PartyInvitationState.CANCEL)}>Cancel</Button>
            </>
          )
        }
      }

      default: {
        return {
          open: false
        }
      }
    }
  };

  return [{ state, dialogProps: getDialogProps(state) }, handleReset];
};

// TODO(burdon): Replace ShareDialog
export const PartyInvitationDialog = () => {
  const [{ dialogProps }, reset] = usePartyInvitationDialogState();

  return (
    <CustomizableDialog {...dialogProps} />
  );
}
