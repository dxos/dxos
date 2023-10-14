//
// Copyright 2023 DXOS.org
//

import { Presentation } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal';
import React from 'react';

import { SPLITVIEW_PLUGIN, SplitViewAction } from '@braneframe/plugin-splitview';
import { isStack } from '@braneframe/plugin-stack';
import { type PluginDefinition } from '@dxos/react-surface';

import { PresenterMain } from './components';
import translations from './translations';
import { PRESENTER_PLUGIN, PresenterContext, type PresenterPluginProvides } from './types';

// TODO(burdon): Map stack content; Slide content type (e.g., markdown, sketch, IPFS image, table, etc.)
// TODO(burdon): View mode (switch surface from stack via menu/intent).
//  - Short term create additional graph node?
// TODO(burdon): Key bindings.

type PresenterState = {
  presenting: boolean;
};

export const PresenterPlugin = (): PluginDefinition<PresenterPluginProvides> => {
  // TODO(burdon): Do we need context providers if we can get the state from the plugin?
  const state = deepSignal<PresenterState>({ presenting: false });

  return {
    meta: {
      id: PRESENTER_PLUGIN,
    },
    provides: {
      translations,
      graph: {
        withPlugins: (plugins) => (parent) => {
          if (isStack(parent.data)) {
            parent.addAction({
              id: 'toggle-presentation',
              label: ['toggle presentation label', { ns: PRESENTER_PLUGIN }],
              icon: (props) => <Presentation {...props} />,
              intent: [
                {
                  plugin: PRESENTER_PLUGIN,
                  action: 'toggle-presentation',
                  data: { state: !state.presenting },
                },
                {
                  plugin: SPLITVIEW_PLUGIN,
                  action: SplitViewAction.TOGGLE_FULLSCREEN,
                  data: { state: !state.presenting },
                },
              ],
              keyBinding: 'shift+meta+p',
            });
          }
        },
      },
      context: ({ children }) => {
        return (
          <PresenterContext.Provider
            value={{
              running: state.presenting,
              start: () => (state.presenting = true),
              stop: () => (state.presenting = false),
            }}
          >
            {children}
          </PresenterContext.Provider>
        );
      },
      component: (data, role) => {
        if (!data || typeof data !== 'object') {
          return null;
        }

        if (state.presenting && role === 'main' && isStack(data)) {
          return PresenterMain;
        }

        return null;
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case 'toggle-presentation': {
              state.presenting = intent.data?.state ?? !state.presenting;
              break;
            }
          }
        },
      },
    },
  };
};
