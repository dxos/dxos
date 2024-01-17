//
// Copyright 2023 DXOS.org
//

import { ArrowUUpLeft, ArrowUUpRight } from '@phosphor-icons/react';
import React from 'react';

import { resolvePlugin, parseIntentPlugin, type PluginDefinition } from '@dxos/app-framework';

import meta, { UNDO_PLUGIN } from './meta';
import translations from './translations';
import { UndoAction, type UndoActionPair, type UndoPluginProvides } from './types';

export const UndoPlugin = (): PluginDefinition<UndoPluginProvides> => {
  let actions: UndoActionPair | undefined;

  return {
    meta,
    provides: {
      undo: {
        exec: async ({ undo, redo }) => {
          // TODO(burdon): Timeout.
          // TODO(burdon): Trigger visible undo.
          actions = { undo, redo };
          await redo();
        },
      },
      translations,
      graph: {
        builder: ({ parent, plugins }) => {
          const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

          // TODO(burdon): Visibility based on state.

          parent.addAction({
            id: UndoAction.UNDO,
            label: ['undo label', { ns: UNDO_PLUGIN }],
            icon: (props) => <ArrowUUpRight {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: UNDO_PLUGIN,
                  action: UndoAction.UNDO,
                },
              ]),
          });
          parent.addAction({
            id: UndoAction.REDO,
            label: ['redo label', { ns: UNDO_PLUGIN }],
            icon: (props) => <ArrowUUpLeft {...props} />,
            invoke: () =>
              intentPlugin?.provides.intent.dispatch([
                {
                  plugin: UNDO_PLUGIN,
                  action: UndoAction.REDO,
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
              if (actions) {
                void actions?.undo?.();
              }
              break;
            }
            case UndoAction.REDO: {
              if (actions) {
                void actions?.redo?.();
              }
              break;
            }
          }
        },
      },
    },
  };
};
