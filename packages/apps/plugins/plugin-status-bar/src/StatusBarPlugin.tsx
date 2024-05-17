//
// Copyright 2024 DXOS.org
//

import React from 'react';

import {
  type PluginDefinition,
  type TranslationsProvides,
  type SurfaceProvides,
  type IntentResolverProvides,
  type IntentResolver,
} from '@dxos/app-framework';

import { StatusBarImpl } from './components';
import { mkIntentBuilder } from './lib';
import meta, { STATUS_BAR_PLUGIN } from './meta';
import translations from './translations';

// -- Types and constants.
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

const resolver: IntentResolver = async (intent, _plugins) => {};

// -- Root plugin definition.
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
      intent: { resolver },
    },
  };
};
