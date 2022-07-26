//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { Link as RouterLink, Navigate, Outlet, useParams } from 'react-router-dom';

import {
  Dangerous as ResetIcon,
  Devices as DevicesIcon,
  Redeem as JoinIcon
} from '@mui/icons-material';
import { AppBar, Link, Toolbar } from '@mui/material';

import { useParties, useProfile } from '@dxos/react-client';
import { DXOS, FullScreen } from '@dxos/react-components';

import { ActionType, useActions, useSafePartyKey } from '../../hooks';
import { ActionDialog } from '../ActionDialog';
import { AppBarMenuOption, AppToolbar } from './AppToolbar';

const useOptions = (): AppBarMenuOption[] => {
  const [, dispatch] = useActions();

  const options = [
    {
      icon: DevicesIcon,
      text: 'Invite Device',
      onClick: async () => {
        dispatch({ type: ActionType.HALO_SHARING });
      }
    },
    {
      icon: JoinIcon,
      text: 'Join Party',
      onClick: async () => {
        dispatch({ type: ActionType.PARTY_JOIN });
      }
    },
    // TODO(wittjosiah): Move to settings to make less prominent?
    {
      icon: ResetIcon,
      text: 'Reset Storage',
      onClick: async () => {
        dispatch({ type: ActionType.DANGEROUSLY_RESET_STORAGE });
      }
    }
  ];

  return options;
};

export const AppLayout = () => {
  // DXOS
  const profile = useProfile();
  const parties = useParties();

  // React Router
  const { party: partyHex } = useParams();
  const partyKey = useSafePartyKey(partyHex);
  const party = partyKey && parties.find(({ key }) => key.equals(partyKey));

  // App State
  const options = useOptions();

  if (partyKey && !party) {
    return (
      <Navigate to='/' />
    );
  }

  return (
    <FullScreen>
      <AppBar>
        <AppToolbar
          dense
          profile={profile}
          options={options}
        >
          <Link component={RouterLink} to='/' color='inherit'>
            <DXOS />
          </Link>
          {party?.properties.get('title')}
        </AppToolbar>
      </AppBar>

      <Toolbar variant='dense' />
      <Outlet context={{ party }} />

      <ActionDialog />
    </FullScreen>
  );
};
