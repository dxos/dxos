//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Client } from '@dxos/client';

import { useModule } from '../../hooks';
import { Join, Share } from '../invitations';
import { MenuItem, Module, Panel } from '../util';
import { Contacts } from './Contacts';
import { CreateProfile } from './CreateProfile';
import { Devices } from './Devices';
import { Keychain } from './Keychain';
import { Profile } from './Profile';
import { RecoverProfile } from './RecoverProfile';

export const createHaloMenu = (client: Client): MenuItem => {
  return {
    id: 'halo',
    label: 'HALO',
    component: ({ parent }) => {
      return (
        <Module
          id='halo'
          parent={parent}
          items={
            !client.halo.profile
              ? [
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
                    component: () => <RecoverProfile />
                  }
                ]
              : [
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
                          onCreate={async () => {
                            const observable = client.halo.createInvitation();
                            throw new Error('Not implemented.');
                          }}
                        />
                      </Panel>
                    )
                  },
                  {
                    id: 'join',
                    label: 'Auth Device',
                    component: () => <Join />
                  }
                ]
          }
        />
      );
    }
  };
};
