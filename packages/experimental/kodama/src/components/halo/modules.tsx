//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Client } from '@dxos/client';

import { useModule } from '../../hooks/index.js';
import { Join, Share } from '../invitations/index.js';
import { MenuItem, Module, Panel } from '../util/index.js';
import { Contacts } from './Contacts.js';
import { CreateProfile } from './CreateProfile.js';
import { Devices } from './Devices.js';
import { Keychain } from './Keychain.js';
import { Profile } from './Profile.js';
import { RecoverProfile } from './RecoverProfile.js';

export const createHaloMenu = (client: Client): MenuItem => {
  return {
    id: 'halo',
    label: 'HALO',
    component: ({ parent }) => {
      return (
        <Module
          id='halo'
          parent={parent}
          items={!client.halo.profile ? [
            {
              id: 'create-profile',
              label: 'Create Profile',
              component: () => {
                const [, setPath] = useModule();
                return (
                  <CreateProfile
                    onCreate={() => {
                      setPath('root'); // TODO(burdon): Navigate to 'root.halo' and reset child component.
                    }}
                  />
                );
              }
            },
            {
              id: 'recover-profile',
              label: 'Recover Identity',
              component: () => (
                <RecoverProfile />
              )
            }
          ] : [
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
              id: 'share',
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
              id: 'join',
              label: 'Auth Device',
              component: () => (
                <Join />
              )
            }
          ]}
        />
      );
    }
  };
};
