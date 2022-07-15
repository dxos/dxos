//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import * as process from 'process';
import React from 'react';

import { useProfile } from '@dxos/react-client';

import {
  Config,
  Contacts,
  CreateProfile,
  Devices,
  JoinParty,
  Keychain,
  Module,
  ModulePanel,
  Panel,
  PartyList,
  Profile,
  RecoverProfile
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
  },
  {
    id: 'quit',
    label: 'Quit',
    exec: () => process.exit()
  }
];

const init: Module[] = [
  {
    id: 'halo',
    label: 'HALO',
    modules: [
      {
        id: 'profile',
        label: 'Create Profile',
        component: () => (
          <Panel>
            <CreateProfile />
          </Panel>
        )
      },
      {
        id: 'recover',
        label: 'Recover Identity',
        component: () => (
          <Panel>
            <RecoverProfile />
          </Panel>
        )
      }
    ]
  },
  {
    id: 'quit',
    label: 'Quit',
    exec: () => process.exit()
  }
];

/**
 * Top-level app with menu.
 */
export const App = () => {
  const profile = useProfile();

  return (
    <Box>
      <ModulePanel
        modules={profile ? root : init}
      />
    </Box>
  );
};
