//
// Copyright 2025 DXOS.org
//

import { batch } from '@preact/signals-core';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import {
  Capabilities,
  IntentAction,
  LayoutAction,
  type PluginContext,
  chain,
  contributes,
  createIntent,
  createResolver,
  defineCapabilityModule,
} from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { isLiveObject } from '@dxos/live-object';
import { log } from '@dxos/log';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { isActionLike } from '@dxos/plugin-graph';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { byPosition, isNonNullable } from '@dxos/util';

import { closeEntry, createEntryId, incrementPlank, openEntry } from '../layout';
import { meta } from '../meta';
import {
  DeckAction,
  type DeckSettingsProps,
  type LayoutMode,
  PLANK_COMPANION_TYPE,
  defaultDeck,
  getMode,
  isLayoutMode,
} from '../types';
import { setActive } from '../util';

import { DeckCapabilities } from './capabilities';

export default defineCapabilityModule((context: PluginContext) =>
  contributes(Capabilities.IntentResolver, [
    createResolver({
      intent: IntentAction.ShowUndo,
      resolve: (data) => {
        const layout = context.getCapability(DeckCapabilities.MutableDeckState);
        const { undoPromise: undo } = context.getCapability(Capabilities.IntentDispatcher);

        // TODO(wittjosiah): Support undoing further back than the last action.
        if (layout.currentUndoId) {
          layout.toasts = layout.toasts.filter((toast) => toast.id !== layout.currentUndoId);
        }
        layout.currentUndoId = `${IntentAction.ShowUndo._tag}-${Date.now()}`;
        layout.toasts = [
          ...layout.toasts,
          {
            id: layout.currentUndoId,
            title: data.message ?? ['undo available label', { ns: meta.id }],
            duration: 10_000,
            actionLabel: ['undo action label', { ns: meta.id }],
            actionAlt: ['undo action alt', { ns: meta.id }],
            closeLabel: ['undo close label', { ns: meta.id }],
            onAction: () => undo(),
          },
        ];
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdateSidebar.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.UpdateSidebar.fields.input> =>
        Schema.is(LayoutAction.UpdateSidebar.fields.input)(data),
      resolve: ({ options }) => {
        const layout = context.getCapability(DeckCapabilities.MutableDeckState);
        const next = options?.state ?? layout.sidebarState;
        if (next !== layout.sidebarState) {
          layout.sidebarState = next;
        }
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdateComplementary.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.UpdateComplementary.fields.input> =>
        Schema.is(LayoutAction.UpdateComplementary.fields.input)(data),
      resolve: ({ subject, options }) => {
        const layout = context.getCapability(DeckCapabilities.MutableDeckState);
        if (layout.complementarySidebarPanel !== subject) {
          layout.complementarySidebarPanel = subject;
        }

        const next = subject ? 'expanded' : (options?.state ?? layout.complementarySidebarState);
        if (next !== layout.complementarySidebarState) {
          layout.complementarySidebarState = next;
        }
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdateDialog.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.UpdateDialog.fields.input> =>
        Schema.is(LayoutAction.UpdateDialog.fields.input)(data),
      resolve: ({ subject, options }) => {
        const layout = context.getCapability(DeckCapabilities.MutableDeckState);
        layout.dialogOpen = options.state ?? Boolean(subject);
        layout.dialogType = options.type ?? 'default';
        layout.dialogBlockAlign = options.blockAlign ?? 'center';
        layout.dialogOverlayClasses = options.overlayClasses;
        layout.dialogOverlayStyle = options.overlayStyle;
        layout.dialogContent = subject ? { component: subject, props: options.props } : null;
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.UpdatePopover.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.UpdatePopover.fields.input> =>
        Schema.is(LayoutAction.UpdatePopover.fields.input)(data),
      resolve: ({ subject, options }) => {
        const layout = context.getCapability(DeckCapabilities.MutableDeckState);
        layout.popoverOpen = options.state ?? Boolean(subject);
        layout.popoverContent =
          typeof subject === 'string' ? { component: subject, props: options.props } : subject ? { subject } : null;
        layout.popoverSide = options.side;
        if (options.variant === 'virtual') {
          layout.popoverAnchor = options.anchor;
        } else {
          layout.popoverAnchorId = options.anchorId;
        }
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.AddToast.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.AddToast.fields.input> =>
        Schema.is(LayoutAction.AddToast.fields.input)(data),
      resolve: ({ subject }) => {
        const layout = context.getCapability(DeckCapabilities.MutableDeckState);
        layout.toasts.push(subject);
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      // TODO(wittjosiah): This should be able to just be `Schema.is(LayoutAction.SetLayoutMode.fields.input)`
      //  but the filter is not being applied correctly.
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.SetLayoutMode.fields.input> => {
        if (!Schema.is(LayoutAction.SetLayoutMode.fields.input)(data)) {
          return false;
        }

        if ('mode' in data.options) {
          return isLayoutMode(data.options.mode);
        }

        return true;
      },
      resolve: ({ subject, options }) => {
        const state = context.getCapability(DeckCapabilities.MutableDeckState);

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

          if (mode === 'solo--fullscreen') {
            deck.fullscreen = !deck.fullscreen;
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
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.SwitchWorkspace.fields.input> =>
        Schema.is(LayoutAction.SwitchWorkspace.fields.input)(data),
      resolve: ({ subject }) => {
        const { graph } = context.getCapability(Capabilities.AppGraph);
        const state = context.getCapability(DeckCapabilities.MutableDeckState);
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
        } else {
          const [item] = graph
            .getConnections(subject)
            .filter((node) => !isActionLike(node) && !node.properties.disposition);
          if (item) {
            return {
              intents: [createIntent(LayoutAction.Open, { part: 'main', subject: [item.id] })],
            };
          }
        }
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.RevertWorkspace.fields.input> =>
        Schema.is(LayoutAction.RevertWorkspace.fields.input)(data),
      resolve: () => {
        const state = context.getCapability(DeckCapabilities.MutableDeckState);
        return {
          intents: [createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: state.previousDeck })],
        };
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.Open.fields.input> =>
        Schema.is(LayoutAction.Open.fields.input)(data),
      resolve: ({ subject, options }) =>
        Effect.gen(function* () {
          const { graph } = context.getCapability(Capabilities.AppGraph);
          const state = context.getCapability(DeckCapabilities.MutableDeckState);
          const attention = context.getCapability(AttentionCapabilities.Attention);
          const settings = context
            .getCapabilities(Capabilities.SettingsStore)[0]
            ?.getStore<DeckSettingsProps>(meta.id)?.value;

          if (options?.workspace && state.activeDeck !== options?.workspace) {
            const { dispatch } = context.getCapability(Capabilities.IntentDispatcher);
            yield* dispatch(
              createIntent(LayoutAction.SwitchWorkspace, { part: 'workspace', subject: options.workspace }),
            );
          }

          const previouslyOpenIds = new Set<string>(state.deck.solo ? [state.deck.solo] : state.deck.active);
          batch(() => {
            const next = state.deck.solo
              ? (subject as string[]).map((id) => createEntryId(id, options?.variant))
              : subject.reduce(
                  (acc, entryId) =>
                    openEntry(acc, entryId, {
                      key: options?.key,
                      positioning: options?.positioning ?? settings?.newPlankPositioning,
                      pivotId: options?.pivotId,
                      variant: options?.variant,
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
              ...newlyOpen.map((subjectId) => {
                const typename = Option.match(graph.getNode(subjectId), {
                  onNone: () => undefined,
                  onSome: (node) => {
                    const active = node.data;
                    return isLiveObject(active) ? Obj.getTypename(active) : undefined;
                  },
                });
                return createIntent(ObservabilityAction.SendEvent, {
                  name: 'navigation.activate',
                  properties: {
                    subjectId,
                    typename,
                  },
                });
              }),
            ],
          };
        }),
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.Close.fields.input> =>
        Schema.is(LayoutAction.Close.fields.input)(data),
      resolve: ({ subject }) => {
        const state = context.getCapability(DeckCapabilities.MutableDeckState);
        const attention = context.getCapability(AttentionCapabilities.Attention);
        const active = state.deck.solo ? [state.deck.solo] : state.deck.active;
        const next = subject.reduce((acc, id) => closeEntry(acc, id), active);
        const toAttend = setActive({ next, state, attention });

        const clearCompanionIntents = subject
          .filter((id) => state.deck.activeCompanions && id in state.deck.activeCompanions)
          .map((primary) => createIntent(DeckAction.ChangeCompanion, { primary, companion: null }));

        return {
          intents: [
            ...clearCompanionIntents,
            ...(toAttend ? [createIntent(LayoutAction.ScrollIntoView, { part: 'current', subject: toAttend })] : []),
          ],
        };
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.Set.fields.input> =>
        Schema.is(LayoutAction.Set.fields.input)(data),
      resolve: ({ subject }) => {
        const state = context.getCapability(DeckCapabilities.MutableDeckState);
        const attention = context.getCapability(AttentionCapabilities.Attention);
        const toAttend = setActive({ next: subject as string[], state, attention });
        return {
          intents: toAttend ? [createIntent(LayoutAction.ScrollIntoView, { part: 'current', subject: toAttend })] : [],
        };
      },
    }),
    createResolver({
      intent: LayoutAction.UpdateLayout,
      filter: (data): data is Schema.Schema.Type<typeof LayoutAction.ScrollIntoView.fields.input> =>
        Schema.is(LayoutAction.ScrollIntoView.fields.input)(data),
      resolve: ({ subject }) => {
        const layout = context.getCapability(DeckCapabilities.MutableDeckState);
        layout.scrollIntoView = subject;
      },
    }),
    createResolver({
      intent: DeckAction.UpdatePlankSize,
      resolve: (data) => {
        const state = context.getCapability(DeckCapabilities.MutableDeckState);
        state.deck.plankSizing[data.id] = data.size;
      },
    }),
    createResolver({
      intent: DeckAction.ChangeCompanion,
      resolve: (data) => {
        const state = context.getCapability(DeckCapabilities.MutableDeckState);
        // TODO(thure): Reactivity only works when creating a lexically new `activeCompanions`… Are these not proxy objects?
        if (data.companion === null) {
          const { [data.primary]: _, ...nextActiveCompanions } = state.deck.activeCompanions ?? {};
          state.deck.activeCompanions = nextActiveCompanions;
        } else {
          invariant(data.companion !== data.primary);
          state.deck.activeCompanions = {
            ...state.deck.activeCompanions,
            [data.primary]: data.companion,
          };
        }
      },
    }),
    createResolver({
      intent: DeckAction.Adjust,
      resolve: (adjustment) => {
        const state = context.getCapability(DeckCapabilities.MutableDeckState);
        const attention = context.getCapability(AttentionCapabilities.Attention);
        const { graph } = context.getCapability(Capabilities.AppGraph);

        return batch(() => {
          if (adjustment.type === 'increment-end' || adjustment.type === 'increment-start') {
            setActive({
              next: incrementPlank(state.deck.active, adjustment),
              state,
              attention,
            });
          }

          if (adjustment.type === 'companion') {
            return Function.pipe(
              graph.getNode(adjustment.id),
              Option.map((node) =>
                graph
                  .getConnections(node.id)
                  .filter((n) => n.type === PLANK_COMPANION_TYPE)
                  .toSorted((a, b) => byPosition(a.properties, b.properties)),
              ),
              Option.flatMap((companions) => (companions.length > 0 ? Option.some(companions[0]) : Option.none())),
              Option.match({
                onNone: () => ({}),
                onSome: (companion) => ({
                  intents: [
                    // TODO(wittjosiah): This should remember the previously selected companion.
                    createIntent(DeckAction.ChangeCompanion, { primary: adjustment.id, companion: companion.id }),
                  ],
                }),
              }),
            );
          }

          if (adjustment.type.startsWith('solo')) {
            const entryId = adjustment.id;
            if (!state.deck.solo) {
              // Solo the entry.
              return {
                intents: [
                  createIntent(LayoutAction.SetLayoutMode, {
                    part: 'mode',
                    subject: entryId,
                    options: { mode: adjustment.type },
                  }),
                ],
              };
            } else {
              if (adjustment.type === 'solo--fullscreen') {
                // Toggle fullscreen on the current entry.
                return {
                  intents: [
                    createIntent(LayoutAction.SetLayoutMode, {
                      part: 'mode',
                      subject: entryId,
                      options: { mode: 'solo--fullscreen' },
                    }),
                  ],
                };
              } else if (adjustment.type === 'solo') {
                // Un-solo the current entry.
                return {
                  intents: [
                    // NOTE: The order of these is important.
                    Function.pipe(
                      createIntent(LayoutAction.SetLayoutMode, { part: 'mode', options: { mode: 'deck' } }),
                      chain(LayoutAction.Open, { part: 'main', subject: [entryId] }),
                    ),
                  ],
                };
              }
            }
          }
        });
      },
    }),
  ]));
