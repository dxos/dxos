/* eslint-disable no-console */
//
// Copyright 2023 DXOS.org
//

import { Mailbox, DiscordLogo, Lightning } from '@phosphor-icons/react';
import React from 'react';

import { type PluginDefinition, type TranslationsProvides, type SurfaceProvides } from '@dxos/app-framework';

import { StatusBar } from './components/StatusBar';
import meta, { STATUS_PLUGIN } from './meta';
import translations from './translations';

const _STATUS_ACTION = `${STATUS_PLUGIN}/action`;

export enum StatusAction {}

export type StatusProvides = {};

export type StatusPluginProvides = SurfaceProvides & TranslationsProvides;

const StatusBarDemo = () => (
  <StatusBar.Container>
    <StatusBar.EndContent>
      <StatusBar.Button>
        <Mailbox />
        <StatusBar.Text classNames='hidden sm:block'>Feedback</StatusBar.Text>
      </StatusBar.Button>
      <StatusBar.Button>
        <DiscordLogo />
        <StatusBar.Text classNames='hidden sm:block'>Discord</StatusBar.Text>
      </StatusBar.Button>
      <StatusBar.Item>
        <Lightning />
        <StatusBar.Text classNames='hidden sm:block'>Online</StatusBar.Text>
      </StatusBar.Item>
    </StatusBar.EndContent>
  </StatusBar.Container>
);

export const MapPlugin = (): PluginDefinition<StatusPluginProvides> => {
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
              return <StatusBarDemo />;
            }
          }

          return null;
        },
      },
    },
  };
};
