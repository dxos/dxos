//
// Copyright 2023 DXOS.org
//

import { Info } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal';
import React from 'react';
import { type Step } from 'react-joyride';

import { type PluginDefinition, parseIntentPlugin, resolvePlugin } from '@dxos/app-framework';

import { HelpContextProvider } from './components';
import meta, { HELP_PLUGIN } from './meta';
import { HelpAction, type HelpPluginProvides } from './types';

export const HelpPlugin = (): PluginDefinition<HelpPluginProvides> => {
  const state = deepSignal<{ running: boolean }>({ running: false });

  // TODO(burdon): Move text to translation object.
  const steps: Step[] = [
    {
      target: '[data-joyride="welcome/1"]',
      title: 'HALO',
      content: 'Click here to access your profile and manage devices.',
      placement: 'right',
      disableBeacon: true,
      floaterProps: {
        style: {
          margin: 16,
        },
      },
    },
    {
      // TODO(burdon): HACK: Extend Graph Node type to include this?
      target: '[data-testid="navtree.treeItem.heading"]',
      title: 'Personal space',
      content: 'Your personal space contains data that will be synchronized across your devices.',
      placement: 'right',
    },
    {
      target: '[data-itemid="shared-spaces"]',
      title: 'Shared spaces',
      content: 'You can create multiple shared spaces to collaborate with your team.',
      placement: 'right',
    },
  ];

  return {
    meta,
    provides: {
      context: ({ children }) => {
        return (
          <HelpContextProvider steps={steps} running={state.running}>
            {children}
          </HelpContextProvider>
        );
      },
      graph: {
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin)!;
          if (parent.id === 'root') {
            parent.addAction({
              id: 'start-help', // TODO(burdon): Standarize.
              label: ['open devtools label', { ns: HELP_PLUGIN }],
              icon: (props) => <Info {...props} />,
              invoke: () =>
                intentPlugin?.provides.intent.dispatch({
                  plugin: HELP_PLUGIN,
                  action: HelpAction.START,
                }),
              keyBinding: 'shift+meta+/',
              properties: {
                testId: 'helpPlugin.openHelp',
              },
            });
          }
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
