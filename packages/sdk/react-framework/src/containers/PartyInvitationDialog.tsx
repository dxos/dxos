//
// Copyright 2020 DXOS.org
//

import { Button, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { encodeInvitation, useClient, useSecretGenerator } from '@dxos/react-client';
import { CopyText, CustomizableDialog, CustomizableDialogProps } from '@dxos/react-components';

import { DialogProps } from './DialogProps';

enum PartyInvitationState {
  INIT,
  DONE
}

export interface usePartyInvitationDialogStateProps extends DialogProps {
  partyKey?: PublicKey
}

export interface usePartyInvitationDialogStateResult {
  reset: () => void,
  state: PartyInvitationState
  dialogProps: CustomizableDialogProps
}

/**
 * Manages the workflow for inviting a user to a party.
 */
export const usePartyInvitationDialogState = ({ partyKey, onClose, open }: usePartyInvitationDialogStateProps): usePartyInvitationDialogStateResult => {
  const [state, setState] = useState<PartyInvitationState>(PartyInvitationState.INIT);
  // TODO(burdon): Multiple invitations at once (show useMembers).
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretGenerator();
  const client = useClient();

  const handleReset = () => {
    resetPin();
    setInvitationCode(undefined);
    setState(PartyInvitationState.INIT);
  };

  const handleCancel = () => {
    handleReset();
    onClose?.();
  };

  useEffect(() => {
    setState(PartyInvitationState.INIT);
  }, [partyKey]);

  useEffect(() => {
    if (state === PartyInvitationState.INIT) {
      handleReset();
    }
  }, [state]);

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
    switch (state) {
      case PartyInvitationState.INIT: {
        return {
          open: !!open,
          title: 'Share Party',
          processing: !!pin,
          content: function SharePartyContent () {
            return (
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
          },
          actions: function SharePartyActions () {
            return (
            <>
              <Button onClick={handleCancel}>Cancel</Button>
            </>
            );
          }
        };
      }

      case PartyInvitationState.DONE: {
        return {
          open: !!open,
          title: 'Shared Party',
          processing: false,
          content: function SharedPartyContent () {
            return (
            <>
              <Typography variant='body1' gutterBottom>
                Successfully shared an invitation to a party!
              </Typography>
            </>
            );
          },
          actions: function SharedPartyActions () {
            return (
            <>
              <Button onClick={handleCancel}>OK</Button>
            </>
            );
          }
        };
      }

      default: {
        return {
          open: !!open
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
