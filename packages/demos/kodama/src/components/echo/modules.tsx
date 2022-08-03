//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Client } from '@dxos/client';

import { Join } from '../invitations';
import { Module } from '../util';
import { PartyList } from './PartyList';

// TODO(burdon): useParty hook.

export const createEchoModule = (client: Client): Module | undefined => {
  if (client.halo.profile) {
    return {
      id: 'echo',
      label: 'ECHO',
      modules: [
        {
          id: 'echo.parties',
          label: 'Parties',
          component: () => (
            <PartyList />
          )
        },
        {
          id: 'echo.members',
          label: 'Members'
        },
        {
          id: 'echo.feeds',
          label: 'Feeds'
        },
        {
          id: 'echo.share',
          label: 'Share'
        },
        {
          id: 'echo.join',
          label: 'Join',
          component: () => (
            <Join />
          )
        }
      ]
    };
  }
};
