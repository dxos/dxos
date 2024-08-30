//
// Copyright 2023 DXOS.org
//

import { type IconProps, Presentation } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { createExtension, type Node } from '@braneframe/plugin-graph';
import { DocumentType } from '@braneframe/plugin-markdown/types';
import { CollectionType } from '@braneframe/plugin-space/types';
import {
  resolvePlugin,
  type PluginDefinition,
  parseIntentPlugin,
  LayoutAction,
  NavigationAction,
  type Intent,
} from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { PresenterMain, PresenterSettings, MarkdownSlide, RevealMain } from './components';
import meta, { PRESENTER_PLUGIN } from './meta';
import translations from './translations';
import {
  PresenterContext,
  type PresenterSettingsProps,
  TOGGLE_PRESENTATION,
  type PresenterPluginProvides,
} from './types';

// TODO(burdon): Only scale markdown content.
// TODO(burdon): Map stack content; Slide content type (e.g., markdown, sketch, IPFS image, table, etc.)

type PresenterState = {
  presenting: boolean;
};

export const PresenterPlugin = (): PluginDefinition<PresenterPluginProvides> => {
  const settings = new LocalStorageStore<PresenterSettingsProps>(PRESENTER_PLUGIN, {});

  // TODO(burdon): Do we need context providers if we can get the state from the plugin?
  const state = create<PresenterState>({ presenting: false });

  return {
    meta,
    provides: {
      translations,
      settings: settings.values,
      graph: {
        builder: (plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
          if (!client || !dispatch) {
            return [];
          }

          return createExtension({
            id: PRESENTER_PLUGIN,
            filter: (node): node is Node<CollectionType | DocumentType> =>
              settings.values.presentCollections
                ? node.data instanceof CollectionType || node.data instanceof DocumentType
                : node.data instanceof DocumentType,
            actions: ({ node }) => {
              const object = node.data;
              const id = fullyQualifiedId(object);
              return [
                {
                  id: `${TOGGLE_PRESENTATION}/${id}`,
                  // TODO(burdon): Allow function so can generate state when activated.
                  //  So can set explicit fullscreen state coordinated with current presenter state.
                  data: async () => {
                    await dispatch([
                      {
                        plugin: PRESENTER_PLUGIN,
                        action: TOGGLE_PRESENTATION,
                        data: { object },
                      },
                      {
                        action: NavigationAction.OPEN,
                        data: { activeParts: { fullScreen: id } },
                      },
                    ]);
                  },
                  properties: {
                    label: ['toggle presentation label', { ns: PRESENTER_PLUGIN }],
                    icon: (props: IconProps) => <Presentation {...props} />,
                    iconSymbol: 'ph--presentation--regular',
                    keyBinding: {
                      macos: 'shift+meta+p',
                      windows: 'shift+alt+p',
                    },
                  },
                },
              ];
            },
          });
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
            case 'main': {
              if (state.presenting) {
                if (data.active instanceof CollectionType) {
                  return { node: <PresenterMain collection={data.active} />, disposition: 'hoist' };
                } else if (data.active instanceof DocumentType) {
                  return { node: <RevealMain document={data.active} />, disposition: 'hoist' };
                }
              }
              return null;
            }
            case 'slide':
              return data.slide instanceof DocumentType ? <MarkdownSlide document={data.slide} /> : null;

            case 'settings':
              return data.plugin === meta.id ? <PresenterSettings settings={settings.values} /> : null;
          }

          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case TOGGLE_PRESENTATION: {
              state.presenting = intent.data?.state ?? !state.presenting;

              const intents = [] as Intent[][];
              if (state.presenting) {
                intents.push([{ action: LayoutAction.SET_LAYOUT_MODE, data: { layoutMode: 'fullscreen' } }]);
              } else {
                intents.push([{ action: LayoutAction.SET_LAYOUT_MODE, data: { revert: true } }]);
              }

              return { data: state.presenting, intents };
            }
          }
        },
      },
    },
  };
};
