//
// Copyright 2021 DXOS.org
//

import React from 'react';
import { useNavigate } from 'react-router-dom';
import urlJoin from 'url-join';

import { Snackbar } from '@mui/material';

import { useClient } from '@dxos/react-client';
import { JoinPartyDialog, HaloSharingDialog, PartySharingDialog } from '@dxos/react-toolkit';

import { AlertDialog } from '../../components';
import { ActionType, useActions } from '../../hooks';
import { getPath } from '../../paths';

/**
 * Application event handler that dispatches actions (events) to various dialogs.
 */
export const ActionDialog = () => {
  const client = useClient();
  const navigate = useNavigate();
  const [action, dispatch] = useActions();

  // TODO(burdon): Split up action handlers.
  switch (action?.type) {
    case ActionType.HALO_SHARING: {
      return (
        <HaloSharingDialog
          open
          onClose={() => dispatch({ type: ActionType.RESET })}
        />
      );
    }

    case ActionType.PARTY_SHARING: {
      return (
        <PartySharingDialog
          open
          partyKey={action.params.partyKey}
          onClose={() => dispatch({ type: ActionType.RESET })}
        />
      );
    }

    case ActionType.PARTY_JOIN: {
      return (
        <JoinPartyDialog
          open
          closeOnSuccess
          onJoin={party => navigate(getPath(party.key))}
          onClose={() => dispatch({ type: ActionType.RESET })}
        />
      );
    }

    case ActionType.NOTIFICATION: {
      return (
        <Snackbar
          open
          autoHideDuration={action.params.duration ?? 5000}
          onClose={() => dispatch({ type: ActionType.RESET })}
          message={action.params.message}
          action={action.params.action}
        />
      );
    }

    case ActionType.DANGEROUSLY_RESET_STORAGE: {
      const reset = async () => {
        await client.reset();
        const { origin, pathname } = window.location;
        window.location.href = urlJoin(origin, pathname);
      };

      // TODO(wittjosiah): Handle with effect.
      if (action.params?.now) {
        void reset();
      }

      return (
        <AlertDialog
          open
          title='Reset storage?'
          content='WARNING: This action cannot be undone.'
          onClose={async (ok: boolean) => {
            if (ok) {
              await reset();
            } else {
              dispatch({ type: ActionType.RESET });
            }
          }}
        />
      );
    }

    default: {
      return null;
    }
  }
};
