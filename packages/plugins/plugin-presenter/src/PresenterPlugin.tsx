//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  resolvePlugin,
  type PluginDefinition,
  parseIntentPlugin,
  LayoutAction,
  NavigationAction,
  createSurface,
  createIntent,
  createResolver,
} from '@dxos/app-framework';
import { create } from '@dxos/live-object';
import { LocalStorageStore } from '@dxos/local-storage';
import { createExtension, type Node } from '@dxos/plugin-graph';
import { DocumentType } from '@dxos/plugin-markdown/types';
import { CollectionType } from '@dxos/plugin-space/types';
import { fullyQualifiedId } from '@dxos/react-client/echo';

import { PresenterMain, PresenterSettings, MarkdownSlide, RevealMain } from './components';
import meta, { PRESENTER_PLUGIN } from './meta';
import translations from './translations';
import { PresenterContext, type PresenterSettingsProps, type PresenterPluginProvides, PresenterAction } from './types';

// TODO(burdon): Only scale markdown content.
// TODO(burdon): Map stack content; Slide content type (e.g., markdown, sketch, IPFS image, table, etc.)

type PresenterState = {
  presenting: boolean;
};

export const PresenterPlugin = (): PluginDefinition<PresenterPluginProvides> => {
  const settings = new LocalStorageStore<PresenterSettingsProps>(PRESENTER_PLUGIN);

  // TODO(burdon): Do we need context providers if we can get the state from the plugin?
  const state = create<PresenterState>({ presenting: false });

  return {
    meta,
    provides: {
      translations,
      settings: settings.values,
      graph: {
        builder: (plugins) => {
          const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatchPromise;
          if (!dispatch) {
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
                  id: `${PresenterAction.TogglePresentation._tag}/${id}`,
                  // TODO(burdon): Allow function so can generate state when activated.
                  //  So can set explicit fullscreen state coordinated with current presenter state.
                  data: async () => {
                    await dispatch(createIntent(PresenterAction.TogglePresentation, { object }));
                  },
                  properties: {
                    label: ['toggle presentation label', { ns: PRESENTER_PLUGIN }],
                    icon: 'ph--presentation--regular',
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
        definitions: () => [
          createSurface({
            id: `${PRESENTER_PLUGIN}/document`,
            role: 'main',
            disposition: 'hoist',
            filter: (data): data is { subject: DocumentType } => data.subject instanceof DocumentType,
            component: ({ data }) => <RevealMain document={data.subject} />,
          }),
          createSurface({
            id: `${PRESENTER_PLUGIN}/collection`,
            role: 'main',
            disposition: 'hoist',
            filter: (data): data is { subject: CollectionType } => data.subject instanceof CollectionType,
            component: ({ data }) => <PresenterMain collection={data.subject} />,
          }),
          createSurface({
            id: `${PRESENTER_PLUGIN}/slide`,
            role: 'slide',
            filter: (data): data is { subject: DocumentType } => data.subject instanceof DocumentType,
            component: ({ data }) => <MarkdownSlide document={data.subject} />,
          }),
          createSurface({
            id: `${PRESENTER_PLUGIN}/settings`,
            role: 'settings',
            filter: (data): data is any => data.subject === PRESENTER_PLUGIN,
            component: () => <PresenterSettings settings={settings.values} />,
          }),
        ],
      },
      intent: {
        resolvers: () =>
          createResolver(PresenterAction.TogglePresentation, ({ object, state: next }) => {
            state.presenting = next ?? !state.presenting;

            if (state.presenting) {
              return {
                intents: [
                  createIntent(LayoutAction.SetLayoutMode, { layoutMode: 'fullscreen' }),
                  createIntent(NavigationAction.Open, { activeParts: { fullScreen: fullyQualifiedId(object) } }),
                ],
              };
            } else {
              return {
                intents: [
                  createIntent(LayoutAction.SetLayoutMode, { revert: true }),
                  createIntent(NavigationAction.Close, { activeParts: { fullScreen: fullyQualifiedId(object) } }),
                ],
              };
            }
          }),
      },
    },
  };
};
