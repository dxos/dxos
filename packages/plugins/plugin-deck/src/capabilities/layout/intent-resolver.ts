//
// Copyright 2025 DXOS.org
//

import { batch } from '@preact/signals-core';

import {
  Capabilities,
  createResolver,
  contributes,
  IntentAction,
  LayoutAction,
  openIds,
  Toast as ToastSchema,
  type LayoutMode,
  type PluginsContext,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { DECK_PLUGIN } from '../../meta';
import { DeckAction } from '../../types';
import { DeckCapabilities } from '../capabilities';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver(DeckAction.UpdatePlankSize, (data) => {
      const deck = context.requestCapability(DeckCapabilities.MutableDeckState);
      deck.plankSizing[data.id] = data.size;
    }),
    createResolver(IntentAction.ShowUndo, (data) => {
      const deck = context.requestCapability(DeckCapabilities.MutableDeckState);
      const layout = context.requestCapability(Capabilities.MutableLayout);
      const { undoPromise: undo } = context.requestCapability(Capabilities.IntentDispatcher);

      // TODO(wittjosiah): Support undoing further back than the last action.
      if (deck.currentUndoId) {
        layout.toasts = layout.toasts.filter((toast) => toast.id !== deck.currentUndoId);
      }
      deck.currentUndoId = `${IntentAction.ShowUndo._tag}-${Date.now()}`;
      layout.toasts = [
        ...layout.toasts,
        {
          id: deck.currentUndoId,
          title: data.message ?? ['undo available label', { ns: DECK_PLUGIN }],
          duration: 10_000,
          actionLabel: ['undo action label', { ns: DECK_PLUGIN }],
          actionAlt: ['undo action alt', { ns: DECK_PLUGIN }],
          closeLabel: ['undo close label', { ns: DECK_PLUGIN }],
          onAction: () => undo(),
        },
      ];
    }),
    createResolver(
      LayoutAction.SetLayout,
      ({ element, state, component, subject, anchorId, dialogBlockAlign, dialogType }) => {
        const layout = context.requestCapability(Capabilities.MutableLayout);
        switch (element) {
          case 'sidebar': {
            layout.sidebarOpen = state ?? !layout.sidebarOpen;
            break;
          }

          case 'complementary': {
            layout.complementarySidebarOpen = !!state;
            // TODO(thure): Hoist content into the c11y sidebar of Deck.
            // layout.complementarySidebarContent = component || subject ? { component, subject } : null;
            break;
          }

          case 'dialog': {
            layout.dialogOpen = state ?? Boolean(component);
            layout.dialogContent = component ? { component, subject } : null;
            layout.dialogBlockAlign = dialogBlockAlign ?? 'center';
            layout.dialogType = dialogType;
            break;
          }

          case 'popover': {
            layout.popoverOpen = state ?? Boolean(component);
            layout.popoverContent = component ? { component, subject } : null;
            layout.popoverAnchorId = anchorId;
            break;
          }

          case 'toast': {
            if (S.is(ToastSchema)(subject)) {
              layout.toasts = [...layout.toasts, subject];
            }
            break;
          }
        }
      },
    ),
    createResolver(LayoutAction.SetLayoutMode, (data) => {
      const layout = context.requestCapability(Capabilities.MutableLayout);
      const location = context.requestCapability(Capabilities.MutableLocation);
      const deck = context.requestCapability(DeckCapabilities.MutableDeckState);

      const setMode = (mode: LayoutMode) => {
        const main = openIds(location.active, ['main']);
        const solo = openIds(location.active, ['solo']);
        const current = layout.layoutMode === 'solo' ? solo : main;
        // When un-soloing, the solo entry is added to the deck.
        const next = mode === 'solo' ? solo : [...main, ...solo];
        const removed = current.filter((id) => !next.includes(id));
        const closed = Array.from(new Set([...location.closed.filter((id) => !next.includes(id)), ...removed]));

        location.closed = closed;
        layout.layoutMode = mode;
      };

      return batch(() => {
        if ('layoutMode' in data) {
          deck.layoutModeHistory.push(layout.layoutMode);
          setMode(data.layoutMode);
        } else if (data.revert) {
          setMode(deck.layoutModeHistory.pop() ?? 'solo');
        } else {
          log.warn('Invalid layout mode', data);
        }
      });
    }),
    createResolver(LayoutAction.ScrollIntoView, ({ id }) => {
      const layout = context.requestCapability(Capabilities.MutableLayout);
      layout.scrollIntoView = id;
    }),
  ]);
