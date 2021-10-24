//
// Copyright 2020 DXOS.org
//

import { Box, Button } from '@mui/material';
import React, { useEffect, useState } from 'react';

import { CopyText, CustomizableDialogProps } from '@dxos/react-components';
import { PublicKey } from '@dxos/crypto';
import { encodeInvitation, useClient, useSecretGenerator } from '@dxos/react-client';

// TODO(burdon): Merge with ShareDialog from wallet.

enum PartyInvitationState {
  INIT,
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
  const [invitationCode, setInvitationCode] = useState<string>();
  const [secretProvider, pin, resetPin] = useSecretGenerator();
  const client = useClient();

  useEffect(() => {
    resetPin();
    setInvitationCode(undefined);
    setState(PartyInvitationState.INIT);
  }, [partyKey]);

  const handleCreateInvitation = () => {
    setImmediate(async () => {
      // TODO(burdon): Handle offline.
      const invitation = await client.createInvitation(partyKey!, secretProvider, {
        onFinish: () => { // TODO(burdon): Normalize callbacks (error, etc.)
          setState(PartyInvitationState.DONE);
        }
      });

      setInvitationCode(encodeInvitation(invitation));
    });
  };

  const getDialogPropse = (state: PartyInvitationState) => {
    switch (state) {
      case PartyInvitationState.INIT: {
        return {
          open: true,
          title: 'Invite Users',
          processing: !!pin,
          content: () => (
            <>
              <Button onClick={handleCreateInvitation}>Create Invitation</Button>
              <Box sx={{ width: 200 }}>
                <CopyText value={invitationCode} />
              </Box>
              <Box sx={{ width: 200 }}>
                <CopyText value={pin} />
              </Box>
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

  return [{ state, dialogProps: getDialogPropse(state) }, () => setState(PartyInvitationState.INIT)];
};
