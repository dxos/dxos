//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Client, Party } from '@dxos/client';

import { Join, Share } from '../invitations';
import { Module, Panel } from '../util';
import { CreateParty } from './CreateParty';
import { PartyFeeds } from './PartyFeeds';
import { PartyMembers } from './PartyMembers';
import { PartyView } from './PartyView';

export const createEchoModule = (client: Client, party?: Party): Module | undefined => {
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
          <Share
            onCreate={() => {
              return party.createInvitation();
            }}
          />
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
