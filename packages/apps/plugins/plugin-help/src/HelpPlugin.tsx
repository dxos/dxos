//
// Copyright 2023 DXOS.org
//

import { type IconProps, Keyboard as KeyboardIcon, Info } from '@phosphor-icons/react';
import React from 'react';

import { resolvePlugin, type PluginDefinition, parseIntentPlugin, LayoutAction } from '@dxos/app-framework';
import { createExtension, type Node } from '@dxos/app-graph';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';

import { HelpContextProvider, ShortcutsDialogContent, ShortcutsHints, ShortcutsList } from './components';
import meta, { HelpAction, HELP_PLUGIN } from './meta';
import translations from './translations';
import { type Step, type HelpPluginProvides } from './types';

export type HelpSettingsProps = { showHints?: boolean; showWelcome?: boolean };

export type HelpPluginOptions = { steps?: Step[] };

export const HelpPlugin = ({ steps = [] }: HelpPluginOptions): PluginDefinition<HelpPluginProvides> => {
  const settings = new LocalStorageStore<HelpSettingsProps>(HELP_PLUGIN, { showHints: true, showWelcome: true });
  const state = create<{ running: boolean }>({ running: false });
  return {
    meta,
    ready: async () => {
      settings
        .prop({ key: 'showHints', storageKey: 'show-hints', type: LocalStorageStore.bool({ allowUndefined: true }) })
        .prop({
          key: 'showWelcome',
          storageKey: 'show-welcome',
          type: LocalStorageStore.bool({ allowUndefined: true }),
        });
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

          return createExtension({
            id: HELP_PLUGIN,
            filter: (node): node is Node<null> => node.id === 'root',
            actions: () => [
              {
                id: HelpAction.START,
                data: async () => {
                  settings.values.showHints = true;
                  await intentPlugin?.provides.intent.dispatch({
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
                data: async () => {
                  settings.values.showHints = true;
                  await intentPlugin?.provides.intent.dispatch({
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
            ],
          });
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
