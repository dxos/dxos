//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { type Client } from '@dxos/client';

import { Contacts } from './Contacts';
import { CreateProfile } from './CreateProfile';
import { Devices } from './Devices';
import { Identity } from './Identity';
import { Keychain } from './Keychain';
import { RecoverProfile } from './RecoverProfile';
import { useModule } from '../../hooks';
import { Join, Share } from '../invitations';
import { type MenuItem, Module, Panel } from '../util';

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
            !client.halo.identity
              ? [
                  {
                    id: 'create-profile',
                    label: 'Create Identity',
                    component: () => {
                      const [, setPath] = useModule();
                      return (
                        <CreateProfile
                          onCreate={() => {
                            setPath('root'); // TODO(burdon): Navigate to 'root.halo' and reset child component.
                          }}
                        />
                      );
                    },
                  },
                  {
                    id: 'recover-profile',
                    label: 'Recover Identity',
                    component: () => <RecoverProfile />,
                  },
                ]
              : [
                  {
                    id: 'profile',
                    label: 'Identity',
                    component: () => (
                      <Panel>
                        <Identity />
                      </Panel>
                    ),
                  },
                  {
                    id: 'keychain',
                    label: 'Keychain',
                    component: () => (
                      <Panel>
                        <Keychain />
                      </Panel>
                    ),
                  },
                  {
                    id: 'contacts',
                    label: 'Contacts',
                    component: () => (
                      <Panel>
                        <Contacts />
                      </Panel>
                    ),
                  },
                  {
                    id: 'devices',
                    label: 'Devices',
                    component: () => (
                      <Panel>
                        <Devices />
                      </Panel>
                    ),
                  },
                  {
                    id: 'share',
                    label: 'Add Device',
                    component: () => (
                      <Panel>
                        <Share
                          onCreate={() => {
                            return client.halo.share();
                          }}
                        />
                      </Panel>
                    ),
                  },
                  {
                    id: 'join',
                    label: 'Auth Device',
                    component: () => <Join />,
                  },
                ]
          }
        />
      );
    },
  };
};
