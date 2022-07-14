//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React from 'react';

import { useAsyncEffect } from '@dxos/react-async';
import { useClient, useProfile } from '@dxos/react-client';

import {
  Config,
  Contacts,
  Devices,
  JoinParty,
  Keychain,
  Module,
  ModulePanel,
  Panel,
  PartyList,
  Profile,
  Recovery
} from './components';

const root: Module[] = [
  {
    id: 'halo',
    label: 'HALO',
    modules: [
      {
        id: 'profile',
        label: 'Profile',
        component: () => (
          <Panel>
            <Profile />
          </Panel>
        )
      },
      {
        id: 'keychain',
        label: 'Keychain',
        component: () => (
          <Panel>
            <Keychain />
          </Panel>
        )
      },
      {
        id: 'contacts',
        label: 'Contacts',
        component: () => (
          <Panel>
            <Contacts />
          </Panel>
        )
      },
      {
        id: 'devices',
        label: 'Devices',
        component: () => (
          <Panel>
            <Devices />
          </Panel>
        )
      },
      {
        id: 'recover',
        label: 'Recover Identity',
        component: () => (
          <Panel>
            <Recovery />
          </Panel>
        )
      }
    ]
  },
  {
    id: 'echo',
    label: 'ECHO',
    modules: [
      {
        id: 'parties',
        label: 'Parties',
        component: () => (
          <PartyList />
        )
      },
      {
        id: 'join',
        label: 'Join',
        component: () => (
          <Panel>
            <JoinParty />
          </Panel>
        )
      }
    ]
  },
  {
    id: 'mesh',
    label: 'MESH'
  },
  // {
  //   id: 'kube',
  //   label: 'KUBE'
  // },
  // {
  //   id: 'dxns',
  //   label: 'DXNS'
  // },
  {
    id: 'config',
    label: 'Config',
    component: () => (
      <Panel>
        <Config />
      </Panel>
    )
  }
];

/**
 * Top-level app with menu.
 */
export const App = () => {
  const client = useClient();
  const profile = useProfile();

  // TODO(burdon): Create temp profile unless one is set already.
  useAsyncEffect(async () => {
    if (!profile) {
      await client.halo.createProfile();
    }
  }, []);

  if (!profile) {
    return null;
  }

  return (
    <Box>
      <ModulePanel
        modules={root}
      />
    </Box>
  );
};
