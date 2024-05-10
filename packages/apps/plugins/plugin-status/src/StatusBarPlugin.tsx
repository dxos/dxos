//
// Copyright 2024 DXOS.org
//

import React from 'react';

import {
  type PluginDefinition,
  type TranslationsProvides,
  type SurfaceProvides,
  type IntentResolverProvides,
} from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';

import { StatusBarImpl } from './components';
import { mkIntentBuilder } from './lib';
import meta, { STATUS_BAR_PLUGIN } from './meta';
import translations from './translations';

const STATUS_BAR_ACTION = `${STATUS_BAR_PLUGIN}/action`;

export enum StatusBarAction {
  PROVIDE_FEEDBACK = `${STATUS_BAR_ACTION}/provide-feedback`,
}

export namespace StatusBarAction {
  export type ProvideFeedback = undefined;
}

type StatusBarActions = {
  [StatusBarAction.PROVIDE_FEEDBACK]: StatusBarAction.ProvideFeedback;
};

export const statusBarIntent = mkIntentBuilder<StatusBarActions>(meta.id);

export type StatusBarPluginProvides = SurfaceProvides & TranslationsProvides & IntentResolverProvides;

const state = create({ feedbackOpen: false });

export const StatusBarPlugin = (): PluginDefinition<StatusBarPluginProvides> => {
  return {
    meta,
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
      intent: {
        resolver: async (intent, _plugins) => {
          switch (intent.action) {
            case StatusBarAction.PROVIDE_FEEDBACK: {
              state.feedbackOpen = true;
              break;
            }
          }
        },
      },
    },
  };
};
