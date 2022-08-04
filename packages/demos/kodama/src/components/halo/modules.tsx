//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Client } from '@dxos/client';

import { Join, Share } from '../invitations';
import { Module, Panel } from '../util';
import { Contacts } from './Contacts';
import { CreateProfile } from './CreateProfile';
import { Devices } from './Devices';
import { Keychain } from './Keychain';
import { Profile } from './Profile';
import { RecoverProfile } from './RecoverProfile';

export const createHaloModule = (client: Client): Module => {
  return {
    id: 'halo',
    label: 'HALO',
    modules: client.halo.profile ? [
      {
        id: 'halo.profile',
        label: 'Profile',
        component: () => (
          <Panel>
            <Profile />
          </Panel>
        )
      },
      {
        id: 'halo.keychain',
        label: 'Keychain',
        component: () => (
          <Panel>
            <Keychain />
          </Panel>
        )
      },
      {
        id: 'halo.contacts',
        label: 'Contacts',
        component: () => (
          <Panel>
            <Contacts />
          </Panel>
        )
      },
      {
        id: 'halo.devices',
        label: 'Devices',
        component: () => (
          <Panel>
            <Devices />
          </Panel>
        )
      },
      {
        id: 'halo.share',
        label: 'Add Device',
        component: () => (
          <Panel>
            <Share
              onCreate={() => {
                return client.halo.createInvitation();
              }}
            />
          </Panel>
        )
      },
      {
        id: 'halo.join',
        label: 'Auth Device',
        component: () => (
          <Join />
        )
      }
    ] : [
      {
        id: 'halo.profile',
        label: 'Create Profile',
        component: () => (
          <CreateProfile />
        )
      },
      {
        id: 'halo.recover',
        label: 'Recover Identity',
        component: () => (
          <RecoverProfile />
        )
      }
    ]
  };
};
