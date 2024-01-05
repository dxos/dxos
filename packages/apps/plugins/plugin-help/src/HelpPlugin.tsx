//
// Copyright 2023 DXOS.org
//

import { Info, Keyboard as KeyboardIcon } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal';
import React from 'react';
import { type Step } from 'react-joyride';

import { LayoutAction, type PluginDefinition, parseIntentPlugin, resolvePlugin } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

import { HelpContextProvider, ShortcutsDialogContent, ShortcutsHints } from './components';
import meta, { HELP_PLUGIN } from './meta';
import translations from './translations';
import { HelpAction, type HelpPluginProvides } from './types';

export type HelpSettingsProps = { showHints?: boolean; showWelcome?: boolean };

export type HelpPluginOptions = { steps?: Step[] };

export const HelpPlugin = ({ steps = [] }: HelpPluginOptions): PluginDefinition<HelpPluginProvides> => {
  const settings = new LocalStorageStore<HelpSettingsProps>(HELP_PLUGIN, { showHints: true, showWelcome: true });
  const state = deepSignal<{ running: boolean }>({ running: false });

  return {
    meta,
    ready: async () => {
      settings
        .prop(settings.values.$showHints!, 'showHints', LocalStorageStore.bool)
        .prop(settings.values.$showWelcome!, 'showWelcome', LocalStorageStore.bool);
    },
    provides: {
      context: ({ children }) => {
        return (
          <HelpContextProvider steps={steps} running={state.running}>
            {children}
          </HelpContextProvider>
        );
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin)!;
          if (parent.id === 'root') {
            parent.addAction({
              id: 'start-help', // TODO(burdon): Standarize.
              label: ['open help tour', { ns: HELP_PLUGIN }],
              icon: (props) => <Info {...props} />,
              invoke: () => {
                settings.values.showHints = true;
                return intentPlugin?.provides.intent.dispatch({
                  plugin: HELP_PLUGIN,
                  action: HelpAction.START,
                });
              },
              keyBinding: 'shift+meta+/',
              properties: {
                testId: 'helpPlugin.openHelp',
              },
            });

            parent.addAction({
              id: 'show-shortcuts',
              label: ['open shortcuts label', { ns: HELP_PLUGIN }],
              icon: (props) => <KeyboardIcon {...props} />,
              keyBinding: 'meta+/',
              invoke: () => {
                settings.values.showHints = true;
                return intentPlugin?.provides.intent.dispatch({
                  action: LayoutAction.OPEN_DIALOG,
                  data: {
                    component: `${HELP_PLUGIN}/Shortcuts`,
                  },
                });
              },
            });
          }
        },
      },
      surface: {
        component: ({ data, role }) => {
          switch (role) {
            case 'hints':
              return settings.values.showHints ? (
                <ShortcutsHints onClose={() => (settings.values.showHints = false)} />
              ) : null;
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
