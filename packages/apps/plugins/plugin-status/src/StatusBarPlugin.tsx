/* eslint-disable no-console */
//
// Copyright 2023 DXOS.org
//

import { Mailbox, DiscordLogo, Lightning } from '@phosphor-icons/react';
import React from 'react';

import { type PluginDefinition, type TranslationsProvides, type SurfaceProvides } from '@dxos/app-framework';

import { StatusBar } from './components/StatusBar';
import meta, { STATUS_BAR_PLUGIN } from './meta';
import translations from './translations';

const _STATUS_BAR_ACTION = `${STATUS_BAR_PLUGIN}/action`;

export enum StatusBarAction {}

export type StatusBarPluginProvides = SurfaceProvides & TranslationsProvides;

export const StatusBarPlugin = (): PluginDefinition<StatusBarPluginProvides> => {
  // TODO: Initialise state here

  return {
    meta,
    initialize: async () => {
      console.log('StatusPlugin:initialize');
    },
    provides: {
      translations,
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'status-bar': {
              return <StatusBarImpl />;
            }
          }

          return null;
        },
      },
    },
  };
};

const StatusBarImpl = () => (
  <StatusBar.Container>
    <StatusBar.EndContent>
      <StatusBar.Button onClick={(e) => console.log('Capture feedback')}>
        <Mailbox />
        <StatusBar.Text classNames='hidden sm:block'>Feedback</StatusBar.Text>
      </StatusBar.Button>
      <a href='https://discord.gg/' target='_blank' rel='noopener noreferrer'>
        <StatusBar.Button>
          <DiscordLogo />
          <StatusBar.Text>Discord</StatusBar.Text>
        </StatusBar.Button>
      </a>
      <StatusBar.Item>
        <Lightning />
        <StatusBar.Text classNames='hidden sm:block'>Online</StatusBar.Text>
      </StatusBar.Item>
    </StatusBar.EndContent>
  </StatusBar.Container>
);
