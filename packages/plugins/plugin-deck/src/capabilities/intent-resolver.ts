//
// Copyright 2025 DXOS.org
//

import { batch } from '@preact/signals-core';
import { pipe } from 'effect';

import {
  Capabilities,
  createResolver,
  contributes,
  IntentAction,
  LayoutAction,
  type PluginsContext,
  createIntent,
  chain,
} from '@dxos/app-framework';
import { getTypename, S } from '@dxos/echo-schema';
import { isReactiveObject } from '@dxos/live-object';
import { log } from '@dxos/log';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { isNonNullable } from '@dxos/util';

import { DeckCapabilities } from './capabilities';
import { closeEntry, incrementPlank, openEntry } from '../layout';
import { DECK_PLUGIN } from '../meta';
import { DeckAction, type LayoutMode, type DeckSettingsProps, isLayoutMode, getMode, defaultDeck } from '../types';
import { setActive } from '../util';

export default (context: PluginsContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: IntentAction.ShowUndo,
      resolve: (data) => {
        const layout = context.requestCapability(DeckCapabilities.MutableDeckState);
        const { undoPromise: undo } = context.requestCapability(Capabilities.IntentDispatcher);

        // TODO(wittjosiah): Support undoing further back than the last action.
        if (layout.currentUndoId) {
          layout.toasts = layout.toasts.filter((toast) => toast.id !== layout.currentUndoId);
        }
        layout.currentUndoId = `${IntentAction.ShowUndo._tag}-${Date.now()}`;
        layout.toasts = [
          ...layout.toasts,
          {
            id: layout.currentUndoId,
            title: data.message ?? ['undo available label', { ns: DECK_PLUGIN }],
            duration: 10_000,
            actionLabel: ['undo action label', { ns: DECK_PLUGIN }],
            actionAlt: ['undo action alt', { ns: DECK_PLUGIN }],
            closeLabel: ['undo close label', { ns: DECK_PLUGIN }],
            onAction: () => undo(),
          },
        ];
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `S.is(LayoutAction.UpdateSidebar.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is S.Schema.Type<typeof LayoutAction.UpdateSidebar.fields.input> =>
        S.is(LayoutAction.UpdateSidebar.fields.input)(data),
      resolve: ({ options }) => {
        const layout = context.requestCapability(DeckCapabilities.MutableDeckState);
        const next = options?.state ?? layout.sidebarState;
        if (next !== layout.sidebarState) {
          layout.sidebarState = next;
        }
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `S.is(LayoutAction.UpdateComplementary.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is S.Schema.Type<typeof LayoutAction.UpdateComplementary.fields.input> =>
        S.is(LayoutAction.UpdateComplementary.fields.input)(data),
      resolve: ({ subject, options }) => {
        const layout = context.requestCapability(DeckCapabilities.MutableDeckState);

        if (layout.complementarySidebarPanel !== subject) {
          layout.complementarySidebarPanel = subject;
        }

        const next = subject ? 'expanded' : options?.state ?? layout.complementarySidebarState;
        if (next !== layout.complementarySidebarState) {
          layout.complementarySidebarState = next;
        }
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `S.is(LayoutAction.UpdateDialog.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is S.Schema.Type<typeof LayoutAction.UpdateDialog.fields.input> =>
        S.is(LayoutAction.UpdateDialog.fields.input)(data),
      resolve: ({ subject, options }) => {
        const layout = context.requestCapability(DeckCapabilities.MutableDeckState);
        layout.dialogOpen = options.state ?? Boolean(subject);
        layout.dialogContent = subject ? { component: subject, props: options.props } : null;
        layout.dialogBlockAlign = options.blockAlign ?? 'center';
        layout.dialogType = options.type ?? 'default';
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `S.is(LayoutAction.UpdatePopover.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is S.Schema.Type<typeof LayoutAction.UpdatePopover.fields.input> =>
        S.is(LayoutAction.UpdatePopover.fields.input)(data),
      resolve: ({ subject, options }) => {
        const layout = context.requestCapability(DeckCapabilities.MutableDeckState);
        layout.popoverOpen = options.state ?? Boolean(subject);
        layout.popoverContent = subject ? { component: subject, props: options.props } : null;
        layout.popoverAnchorId = options.anchorId;
        layout.popoverSide = options.side;
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `S.is(LayoutAction.AddToast.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is S.Schema.Type<typeof LayoutAction.AddToast.fields.input> =>
        S.is(LayoutAction.AddToast.fields.input)(data),
      resolve: ({ subject }) => {
        const layout = context.requestCapability(DeckCapabilities.MutableDeckState);
        layout.toasts.push(subject);
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `S.is(LayoutAction.SetLayoutMode.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is S.Schema.Type<typeof LayoutAction.SetLayoutMode.fields.input> => {
        if (!S.is(LayoutAction.SetLayoutMode.fields.input)(data)) {
          return false;
        }

        if ('mode' in data.options) {
          return isLayoutMode(data.options.mode);
        }

        return true;
      },
      resolve: ({ subject, options }) => {
        const state = context.requestCapability(DeckCapabilities.MutableDeckState);

        const setMode = (mode: LayoutMode) => {
          const deck = state.deck;
          const current = deck.solo ? [deck.solo] : deck.active;
          // When un-soloing, the solo entry is added to the deck.
          const next = (
            mode !== 'deck' ? [subject ?? deck.solo ?? deck.active[0]] : [...deck.active, deck.solo]
          ).filter(isNonNullable);

          const removed = current.filter((id) => !next.includes(id));
          const closed = Array.from(new Set([...deck.inactive.filter((id) => !next.includes(id)), ...removed]));
          deck.inactive = closed;

          if (mode !== 'deck' && next[0]) {
            deck.solo = next[0];
          } else if (mode === 'deck' && deck.solo) {
            deck.solo = undefined;
            deck.initialized = true;
          }

          if (mode === 'fullscreen' && !deck.fullscreen) {
            deck.fullscreen = true;
          } else if (mode !== 'fullscreen' && deck.fullscreen) {
            deck.fullscreen = false;
          }
        };

        return batch(() => {
          if ('mode' in options) {
            const current = getMode(state.deck);
            if (current !== options.mode) {
              state.previousMode[state.activeDeck] = current;
            }
            setMode(options.mode as LayoutMode);
          } else if ('revert' in options) {
            const last = state.previousMode[state.activeDeck];
            setMode(last ?? 'solo');
          } else {
            log.warn('Invalid layout mode', options);
          }
        });
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is S.Schema.Type<typeof LayoutAction.SwitchWorkspace.fields.input> =>
        S.is(LayoutAction.SwitchWorkspace.fields.input)(data),
      resolve: ({ subject }) => {
        const state = context.requestCapability(DeckCapabilities.MutableDeckState);
        batch(() => {
          // TODO(wittjosiah): This is a hack to prevent the previous deck from being set for pinned items.
          //  Ideally this should be worked into the data model in a generic way.
          if (!state.activeDeck.startsWith('!')) {
            state.previousDeck = state.activeDeck;
          }
          state.activeDeck = subject;
          if (!state.decks[subject]) {
            state.decks[subject] = { ...defaultDeck };
          }
        });

        const first = state.deck.solo ? state.deck.solo : state.deck.active[0];
        if (first) {
          return {
            intents: [createIntent(LayoutAction.ScrollIntoView, { part: 'current', subject: first })],
          };
        }
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is S.Schema.Type<typeof LayoutAction.RevertWorkspace.fields.input> =>
        S.is(LayoutAction.RevertWorkspace.fields.input)(data),
      resolve: () => {
        const state = context.requestCapability(DeckCapabilities.MutableDeckState);
        return {
          intents: [createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: state.previousDeck })],
        };
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is S.Schema.Type<typeof LayoutAction.Open.fields.input> =>
        S.is(LayoutAction.Open.fields.input)(data),
      resolve: ({ subject, options }) => {
        const { graph } = context.requestCapability(Capabilities.AppGraph);
        const state = context.requestCapability(DeckCapabilities.MutableDeckState);
        const attention = context.requestCapability(AttentionCapabilities.Attention);
        const settings = context
          .requestCapabilities(Capabilities.SettingsStore)[0]
          ?.getStore<DeckSettingsProps>(DECK_PLUGIN)?.value;

        const previouslyOpenIds = new Set<string>(state.deck.solo ? [state.deck.solo] : state.deck.active);
        batch(() => {
          const next = state.deck.solo
            ? (subject as string[])
            : subject.reduce(
                (acc, entryId) =>
                  openEntry(acc, entryId, {
                    key: options?.key,
                    positioning: options?.positioning ?? settings?.newPlankPositioning,
                    pivotId: options?.pivotId,
                  }),
                state.deck.active,
              );

          return setActive({ next, state, attention });
        });

        const ids = state.deck.solo ? [state.deck.solo] : state.deck.active;
        const newlyOpen = ids.filter((i) => !previouslyOpenIds.has(i));

        return {
          intents: [
            ...(options?.scrollIntoView !== false
              ? [createIntent(LayoutAction.ScrollIntoView, { part: 'current', subject: newlyOpen[0] ?? subject[0] })]
              : []),
            createIntent(LayoutAction.Expose, { part: 'navigation', subject: newlyOpen[0] ?? subject[0] }),
            ...newlyOpen.map((id) => {
              const active = graph?.findNode(id)?.data;
              const typename = isReactiveObject(active) ? getTypename(active) : undefined;
              return createIntent(ObservabilityAction.SendEvent, {
                name: 'navigation.activate',
                properties: {
                  id,
                  typename,
                },
              });
            }),
          ],
        };
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is S.Schema.Type<typeof LayoutAction.Close.fields.input> =>
        S.is(LayoutAction.Close.fields.input)(data),
      resolve: ({ subject }) => {
        const state = context.requestCapability(DeckCapabilities.MutableDeckState);
        const attention = context.requestCapability(AttentionCapabilities.Attention);
        const active = state.deck.solo ? [state.deck.solo] : state.deck.active;
        const next = subject.reduce((acc, id) => closeEntry(acc, id), active);
        const toAttend = setActive({ next, state, attention });
        return {
          intents: toAttend ? [createIntent(LayoutAction.ScrollIntoView, { part: 'current', subject: toAttend })] : [],
        };
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is S.Schema.Type<typeof LayoutAction.Set.fields.input> =>
        S.is(LayoutAction.Set.fields.input)(data),
      resolve: ({ subject }) => {
        const state = context.requestCapability(DeckCapabilities.MutableDeckState);
        const attention = context.requestCapability(AttentionCapabilities.Attention);
        const toAttend = setActive({ next: subject as string[], state, attention });
        return {
          intents: toAttend ? [createIntent(LayoutAction.ScrollIntoView, { part: 'current', subject: toAttend })] : [],
        };
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is S.Schema.Type<typeof LayoutAction.ScrollIntoView.fields.input> =>
        S.is(LayoutAction.ScrollIntoView.fields.input)(data),
      resolve: ({ subject }) => {
        const layout = context.requestCapability(DeckCapabilities.MutableDeckState);
        layout.scrollIntoView = subject;
      },
    }),
    createResolver({
      intent: DeckAction.UpdatePlankSize,
      resolve: (data) => {
        const state = context.requestCapability(DeckCapabilities.MutableDeckState);
        state.deck.plankSizing[data.id] = data.size;
      },
    }),
    createResolver({
      intent: DeckAction.Adjust,
      resolve: (adjustment) => {
        const state = context.requestCapability(DeckCapabilities.MutableDeckState);
        const attention = context.requestCapability(AttentionCapabilities.Attention);

        return batch(() => {
          if (adjustment.type === 'increment-end' || adjustment.type === 'increment-start') {
            setActive({
              next: incrementPlank(state.deck.active, adjustment),
              state,
              attention,
            });
          }

          if (adjustment.type === 'solo') {
            const entryId = adjustment.id;
            if (!state.deck.solo) {
              // Solo the entry.
              return {
                intents: [
                  createIntent(LayoutAction.SetLayoutMode, {
                    part: 'mode',
                    subject: entryId,
                    options: { mode: 'solo' },
                  }),
                ],
              };
            } else {
              // Un-solo the current entry.
              return {
                intents: [
                  // NOTE: The order of these is important.
                  pipe(
                    createIntent(LayoutAction.SetLayoutMode, { part: 'mode', options: { mode: 'deck' } }),
                    chain(LayoutAction.Open, { part: 'main', subject: [entryId] }),
                  ),
                ],
              };
            }
          }
        });
      },
    }),
  ]);
