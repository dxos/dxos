//
// Copyright 2023 DXOS.org
//

import { ArrowsCounterClockwise } from '@phosphor-icons/react';
import React from 'react';

import { resolvePlugin, parseIntentPlugin, type PluginDefinition } from '@dxos/app-framework';

import meta, { UNDO_PLUGIN } from './meta';
import translations from './translations';
import { UndoAction, type UndoFunction, type UndoPluginProvides } from './types';

export const UndoPlugin = (): PluginDefinition<UndoPluginProvides> => {
  const actions: UndoFunction[] = [];

  return {
    meta,
    provides: {
      undo: {
        push: (action) => {
          actions.push(action);
          console.log('push', actions.length);
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          // TODO(burdon): Based on state.
          parent.addAction({
            id: UndoAction.UNDO,
            label: ['undo label', { ns: UNDO_PLUGIN }],
            icon: (props) => <ArrowsCounterClockwise {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: UNDO_PLUGIN,
                  action: UndoAction.UNDO,
                },
              ]),
          });
        },
      },
      surface: {
        component: ({ data, role }) => {
          return null;
        },
      },
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case UndoAction.UNDO: {
              const action = actions.pop();
              if (action) {
                void action();
              }
              break;
            }
            case UndoAction.REDO: {
              break;
            }
          }
        },
      },
    },
  };
};
