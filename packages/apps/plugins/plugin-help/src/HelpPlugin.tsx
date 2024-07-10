//
// Copyright 2023 DXOS.org
//

import { type IconProps, Keyboard as KeyboardIcon, Info } from '@phosphor-icons/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import {
  resolvePlugin,
  type PluginDefinition,
  parseIntentPlugin,
  LayoutAction,
  createExtension,
  ACTION_TYPE,
} from '@dxos/app-framework';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';

import { HelpContextProvider, ShortcutsDialogContent, ShortcutsHints, ShortcutsList } from './components';
import meta, { HELP_PLUGIN } from './meta';
import translations from './translations';
import { type Step, HelpAction, type HelpPluginProvides } from './types';

export type HelpSettingsProps = { showHints?: boolean; showWelcome?: boolean };

export type HelpPluginOptions = { steps?: Step[] };

export const HelpPlugin = ({ steps = [] }: HelpPluginOptions): PluginDefinition<HelpPluginProvides> => {
  const settings = new LocalStorageStore<HelpSettingsProps>(HELP_PLUGIN, { showHints: true, showWelcome: true });
  const state = create<{ running: boolean }>({ running: false });
  return {
    meta,
    ready: async (plugins) => {
      state.running = !!resolvePlugin(plugins, parseClientPlugin)?.provides.firstRun;
      settings
        .prop({ key: 'showHints', storageKey: 'show-hints', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({
          key: 'showWelcome',
          storageKey: 'show-welcome',
          type: LocalStorageStore.bool({ allowUndefined: true }),
        });
      // TODO(zhenyasav): re-enable welcome tour on startup
      // the following is not enough to re-enable the welcome tour
      // for example, when is the right time to show it after
      // a user landed on a shared piece of content?
      // const isDeviceInvitation = window.location.pathname.indexOf('deviceInvitationCode') >= 0;
      // const isSpaceInvitationCode = window.location.pathname.indexOf('spaceInvitationCode') >= 0;
      // state.running = !!settings.values.showHints && !isDeviceInvitation && !isSpaceInvitationCode;
    },
    provides: {
      context: ({ children }) => {
        return (
          <HelpContextProvider
            steps={steps}
            running={state.running}
            onRunningChanged={(newState) => {
              state.running = newState;
              if (!newState) {
                settings.values.showHints = false;
              }
            }}
          >
            {children}
          </HelpContextProvider>
        );
      },
      translations,
      graph: {
        builder: (plugins) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin)!;

          return [
            createExtension({
              id: HELP_PLUGIN,
              connector: ({ node, relation, type }) => {
                if (node.id === 'root' && relation === 'outbound' && type === ACTION_TYPE) {
                  return [
                    {
                      id: HelpAction.START,
                      type: ACTION_TYPE,
                      data: () => {
                        settings.values.showHints = true;
                        return intentPlugin?.provides.intent.dispatch({
                          plugin: HELP_PLUGIN,
                          action: HelpAction.START,
                        });
                      },
                      properties: {
                        label: ['open help tour', { ns: HELP_PLUGIN }],
                        icon: (props: IconProps) => <Info {...props} />,
                        keyBinding: {
                          macos: 'shift+meta+/',
                          // TODO(wittjosiah): Test on windows to see if it behaves the same as linux.
                          windows: 'shift+ctrl+/',
                          linux: 'shift+ctrl+?',
                        },
                        testId: 'helpPlugin.openHelp',
                      },
                    },
                    {
                      id: 'dxos.org/plugin/help/open-shortcuts',
                      type: ACTION_TYPE,
                      data: () => {
                        settings.values.showHints = true;
                        return intentPlugin?.provides.intent.dispatch({
                          action: LayoutAction.SET_LAYOUT,
                          data: {
                            element: 'dialog',
                            component: `${HELP_PLUGIN}/Shortcuts`,
                          },
                        });
                      },
                      properties: {
                        label: ['open shortcuts label', { ns: HELP_PLUGIN }],
                        icon: (props: IconProps) => <KeyboardIcon {...props} />,
                        keyBinding: {
                          macos: 'meta+/',
                          windows: 'ctrl+/',
                        },
                      },
                    },
                  ];
                }
              },
            }),
          ];
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'hints':
              return settings.values.showHints ? (
                <ShortcutsHints onClose={() => (settings.values.showHints = false)} />
              ) : null;
            case 'keyshortcuts':
              return <ShortcutsList />;
          }

          switch (data.component) {
            case `${HELP_PLUGIN}/Shortcuts`:
              return <ShortcutsDialogContent />;
          }

          return null;
        },
      },
      intent: {
        resolver: async (intent) => {
          switch (intent.action) {
            case HelpAction.START:
              state.running = true;
              break;
          }
        },
      },
    },
  };
};
