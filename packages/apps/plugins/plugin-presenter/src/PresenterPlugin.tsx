//
// Copyright 2023 DXOS.org
//

import { Presentation } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal';
import React from 'react';

import { isDocument } from '@braneframe/plugin-markdown';
import { isStack } from '@braneframe/plugin-stack';
import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';

import { PresenterMain, MarkdownSlideMain } from './components';
import meta, { PRESENTER_PLUGIN } from './meta';
import translations from './translations';
import { PresenterContext, type PresenterPluginProvides } from './types';

// TODO(burdon): Only scale markdown content.
// TODO(burdon): Map stack content; Slide content type (e.g., markdown, sketch, IPFS image, table, etc.)

type PresenterState = {
  presenting: boolean;
};

export const PresenterPlugin = (): PluginDefinition<PresenterPluginProvides> => {
  // TODO(burdon): Do we need context providers if we can get the state from the plugin?
  const state = deepSignal<PresenterState>({ presenting: false });

  return {
    meta,
    provides: {
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          if (isStack(parent.data)) {
            parent.addAction({
              id: 'toggle-presentation',
              label: ['toggle presentation label', { ns: PRESENTER_PLUGIN }],
              icon: (props) => <Presentation {...props} />,
              // TODO(burdon): Allow function so can generate state when activated.
              //  So can set explicit fullscreen state coordinated with current presenter state.
              keyBinding: 'shift+meta+p',
              invoke: () =>
                intentPlugin?.provides.intent.dispatch([
                  {
                    plugin: PRESENTER_PLUGIN,
                    action: 'toggle-presentation',
                  },
                  {
                    action: LayoutAction.SET_LAYOUT,
                    data: { element: 'fullscreen' },
                  },
                ]),
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
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'main':
              return isStack(data.active) && state.presenting
                ? { node: <PresenterMain stack={data.active} />, disposition: 'hoist' }
                : null;
            case 'slide':
              return isDocument(data.slide) ? <MarkdownSlideMain document={data.slide} /> : null;
          }

          return null;
        },
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
