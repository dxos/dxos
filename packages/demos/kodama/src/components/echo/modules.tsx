//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Client, Party } from '@dxos/client';

import { Join, Share } from '../invitations';
import { ModuleDef, Panel } from '../util';
import { CreateParty } from './CreateParty';
import { PartyFeeds } from './PartyFeeds';
import { PartyMembers } from './PartyMembers';
import { PartyView } from './PartyView';

// TODO(burdon): Dynamically change module render based on party.
//  Configure module as React component (similar to <Menu><MenuItem /></Menu>)
export const createEchoModule = (client: Client, party?: Party): ModuleDef | undefined => {
  if (client.halo.profile) {
    const partyModules = party ? [
      {
        id: 'echo.members',
        label: 'Members',
        component: () => (
          <Panel>
            <PartyMembers
              partyKey={party.key}
            />
          </Panel>
        )
      },
      {
        id: 'echo.feeds',
        label: 'Feeds',
        component: () => (
          <Panel>
            <PartyFeeds
              partyKey={party.key}
            />
          </Panel>
        )
      },
      {
        id: 'echo.share',
        label: 'Share Party',
        component: () => (
          <Panel>
            <Share
              onCreate={() => {
                return party.createInvitation();
              }}
            />
          </Panel>
        )
      }
    ] : [];

    return {
      id: 'echo',
      label: 'ECHO',
      modules: [
        {
          id: 'echo.parties',
          label: 'Parties',
          component: () => (
            <PartyView
              partyKey={party?.key}
            />
          )
        },
        {
          id: 'echo.create',
          label: 'Create Party',
          component: () => (
            <CreateParty
              // TODO(burdon): Set toolbar state.
              onCreate={() => {}}
            />
          )
        },
        ...partyModules,
        {
          id: 'echo.join',
          label: 'Join Party',
          component: () => (
            <Join />
          )
        }
      ]
    };
  }
};
