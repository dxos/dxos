//
// Copyright 2025 DXOS.org
//

import { batch } from '@preact/signals-core';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { isLiveObject } from '@dxos/live-object';
import { log } from '@dxos/log';
import { OperationResolver } from '@dxos/operation';
import { Operation } from '@dxos/operation';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Graph, Node } from '@dxos/plugin-graph';
import { ObservabilityOperation } from '@dxos/plugin-observability/types';
import { byPosition, isNonNullable } from '@dxos/util';

import { closeEntry, createEntryId, incrementPlank, openEntry } from '../../layout';
import { meta } from '../../meta';
import {
  DeckCapabilities,
  DeckOperation,
  type DeckSettingsProps,
  type LayoutMode,
  PLANK_COMPANION_TYPE,
  defaultDeck,
  getMode,
  isLayoutMode,
} from '../../types';
import { setActive } from '../../util';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const context = yield* Capability.PluginContextService;

    return Capability.contributes(Common.Capability.OperationResolver, [
      //
      // UpdateSidebar
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateSidebar,
        handler: (input) =>
          Effect.sync(() => {
            const layout = context.getCapability(DeckCapabilities.MutableDeckState);
            const next = input.state ?? layout.sidebarState;
            if (next !== layout.sidebarState) {
              layout.sidebarState = next;
            }
          }),
      }),

      //
      // UpdateComplementary
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateComplementary,
        handler: (input) =>
          Effect.sync(() => {
            const layout = context.getCapability(DeckCapabilities.MutableDeckState);
            if (layout.complementarySidebarPanel !== input.subject) {
              layout.complementarySidebarPanel = input.subject;
            }

            const next = input.subject ? 'expanded' : (input.state ?? layout.complementarySidebarState);
            if (next !== layout.complementarySidebarState) {
              layout.complementarySidebarState = next;
            }
          }),
      }),

      //
      // UpdateDialog
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateDialog,
        handler: (input) =>
          Effect.sync(() => {
            const layout = context.getCapability(DeckCapabilities.MutableDeckState);
            layout.dialogOpen = input.state ?? Boolean(input.subject);
            layout.dialogType = input.type ?? 'default';
            layout.dialogBlockAlign = input.blockAlign ?? 'center';
            layout.dialogOverlayClasses = input.overlayClasses;
            layout.dialogOverlayStyle = input.overlayStyle;
            layout.dialogContent = input.subject ? { component: input.subject, props: input.props } : null;
          }),
      }),

      //
      // UpdatePopover
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdatePopover,
        handler: (input) =>
          Effect.sync(() => {
            const layout = context.getCapability(DeckCapabilities.MutableDeckState);
            layout.popoverOpen = input.state ?? Boolean(input.subject);
            layout.popoverContent =
              typeof input.subject === 'string'
                ? { component: input.subject, props: input.props }
                : input.subject
                  ? { subject: input.subject }
                  : null;
            layout.popoverSide = input.side;
            if (input.variant === 'virtual') {
              layout.popoverAnchor = input.anchor;
            } else {
              layout.popoverAnchorId = input.anchorId;
            }
          }),
      }),

      //
      // AddToast
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.AddToast,
        handler: (input) =>
          Effect.sync(() => {
            const layout = context.getCapability(DeckCapabilities.MutableDeckState);
            layout.toasts.push(input as Common.LayoutOperation.Toast);
          }),
      }),

      //
      // ShowUndo
      //
      OperationResolver.make({
        operation: Common.UndoOperation.ShowUndo,
        handler: (input) =>
          Effect.sync(() => {
            const layout = context.getCapability(DeckCapabilities.MutableDeckState);
            const historyTracker = context.getCapability(Common.Capability.HistoryTracker);

            // TODO(wittjosiah): Support undoing further back than the last action.
            if (layout.currentUndoId) {
              layout.toasts = layout.toasts.filter((toast) => toast.id !== layout.currentUndoId);
            }

            layout.currentUndoId = `show-undo-${Date.now()}`;
            layout.toasts = [
              ...layout.toasts,
              {
                id: layout.currentUndoId,
                title: input.message ?? ['undo available label', { ns: meta.id }],
                duration: 10_000,
                actionLabel: ['undo action label', { ns: meta.id }],
                actionAlt: ['undo action alt', { ns: meta.id }],
                closeLabel: ['undo close label', { ns: meta.id }],
                onAction: () => historyTracker.undoPromise(),
              },
            ];
          }),
      }),

      //
      // SetLayoutMode
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.SetLayoutMode,
        filter: (input) => {
          if ('mode' in input) {
            return isLayoutMode(input.mode);
          }
          return true;
        },
        handler: (input) =>
          Effect.sync(() => {
            const state = context.getCapability(DeckCapabilities.MutableDeckState);

            const setMode = (mode: LayoutMode, subject?: string) => {
              const deck = state.deck;
              const current = deck.solo ? [deck.solo] : deck.active;
              // When un-soloing, the solo entry is added to the deck.
              const next = (
                mode !== 'deck' ? [subject ?? deck.solo ?? deck.active[0]] : [...deck.active, deck.solo]
              ).filter(isNonNullable);

              const removed = current.filter((id: string) => !next.includes(id));
              const closed = Array.from(
                new Set([...deck.inactive.filter((id: string) => !next.includes(id)), ...removed]),
              );
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

            batch(() => {
              if ('mode' in input) {
                const current = getMode(state.deck);
                if (current !== input.mode) {
                  state.previousMode[state.activeDeck] = current;
                }
                setMode(input.mode as LayoutMode, 'subject' in input ? input.subject : undefined);
              } else if ('revert' in input) {
                const last = state.previousMode[state.activeDeck];
                setMode(last ?? 'solo');
              } else {
                log.warn('Invalid layout mode', input);
              }
            });
          }),
      }),

      //
      // SwitchWorkspace
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.SwitchWorkspace,
        handler: (input) =>
          Effect.gen(function* () {
            const { graph } = context.getCapability(Common.Capability.AppGraph);
            const state = context.getCapability(DeckCapabilities.MutableDeckState);

            batch(() => {
              // TODO(wittjosiah): This is a hack to prevent the previous deck from being set for pinned items.
              //   Ideally this should be worked into the data model in a generic way.
              if (!state.activeDeck.startsWith('!')) {
                state.previousDeck = state.activeDeck;
              }
              state.activeDeck = input.subject;
              if (!state.decks[input.subject]) {
                state.decks[input.subject] = { ...defaultDeck };
              }
            });

            const first = state.deck.solo ? state.deck.solo : state.deck.active[0];
            if (first) {
              yield* Operation.schedule(Common.LayoutOperation.ScrollIntoView, { subject: first });
            } else {
              const [item] = Graph.getConnections(graph, input.subject).filter(
                (node) => !Node.isActionLike(node) && !node.properties.disposition,
              );
              if (item) {
                yield* Operation.schedule(Common.LayoutOperation.Open, { subject: [item.id] });
              }
            }
          }),
      }),

      //
      // RevertWorkspace
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.RevertWorkspace,
        handler: () =>
          Effect.gen(function* () {
            const state = context.getCapability(DeckCapabilities.MutableDeckState);
            const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
            yield* invoke(Common.LayoutOperation.SwitchWorkspace, { subject: state.previousDeck });
          }),
      }),

      //
      // Open
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.Open,
        handler: (input) =>
          Effect.gen(function* () {
            const { graph } = context.getCapability(Common.Capability.AppGraph);
            const state = context.getCapability(DeckCapabilities.MutableDeckState);
            const attention = context.getCapability(AttentionCapabilities.Attention);
            const { invoke } = context.getCapability(Common.Capability.OperationInvoker);
            const settings = context
              .getCapabilities(Common.Capability.SettingsStore)[0]
              ?.getStore<DeckSettingsProps>(meta.id)?.value;

            if (input.workspace && state.activeDeck !== input.workspace) {
              yield* invoke(Common.LayoutOperation.SwitchWorkspace, { subject: input.workspace });
            }

            const previouslyOpenIds = new Set<string>(state.deck.solo ? [state.deck.solo] : state.deck.active);
            batch(() => {
              const next = state.deck.solo
                ? input.subject.map((id) => createEntryId(id, input.variant))
                : input.subject.reduce(
                    (acc, entryId) =>
                      openEntry(acc, entryId, {
                        key: input.key,
                        positioning: input.positioning ?? settings?.newPlankPositioning,
                        pivotId: input.pivotId,
                        variant: input.variant,
                      }),
                    state.deck.active,
                  );

              return setActive({ next, state, attention });
            });

            const ids = state.deck.solo ? [state.deck.solo] : state.deck.active;
            const newlyOpen = ids.filter((i: string) => !previouslyOpenIds.has(i));

            if (input.scrollIntoView !== false && (newlyOpen[0] ?? input.subject[0])) {
              yield* Operation.schedule(Common.LayoutOperation.ScrollIntoView, {
                subject: newlyOpen[0] ?? input.subject[0],
              });
            }

            if (newlyOpen[0] ?? input.subject[0]) {
              yield* Operation.schedule(Common.LayoutOperation.Expose, { subject: newlyOpen[0] ?? input.subject[0] });
            }

            // Send analytics events for newly opened items.
            for (const subjectId of newlyOpen) {
              const typename = Option.match(Graph.getNode(graph, subjectId), {
                onNone: () => undefined,
                onSome: (node) => {
                  const active = node.data;
                  return isLiveObject(active) ? Obj.getTypename(active) : undefined;
                },
              });
              yield* Operation.schedule(ObservabilityOperation.SendEvent, {
                name: 'navigation.activate',
                properties: { subjectId, typename },
              });
            }
          }),
      }),

      //
      // UpdatePlankSize
      //
      OperationResolver.make({
        operation: DeckOperation.UpdatePlankSize,
        handler: (input) =>
          Effect.sync(() => {
            const state = context.getCapability(DeckCapabilities.MutableDeckState);
            state.deck.plankSizing[input.id] = input.size;
          }),
      }),

      //
      // Adjust
      //
      OperationResolver.make({
        operation: DeckOperation.Adjust,
        handler: (input) =>
          Effect.gen(function* () {
            const state = context.getCapability(DeckCapabilities.MutableDeckState);
            const attention = context.getCapability(AttentionCapabilities.Attention);
            const { graph } = context.getCapability(Common.Capability.AppGraph);
            const { invoke } = context.getCapability(Common.Capability.OperationInvoker);

            // Collect layout operations to run after batch.
            let soloOperation:
              | { type: 'solo'; entryId: string; mode: string }
              | { type: 'unsolo'; entryId: string }
              | undefined;

            batch(() => {
              if (input.type === 'increment-end' || input.type === 'increment-start') {
                setActive({
                  next: incrementPlank(state.deck.active, input),
                  state,
                  attention,
                });
              }

              if (input.type.startsWith('solo')) {
                const entryId = input.id;
                if (!state.deck.solo) {
                  // Solo the entry.
                  soloOperation = { type: 'solo', entryId, mode: input.type };
                } else {
                  if (input.type === 'solo--fullscreen') {
                    // Toggle fullscreen on the current entry.
                    soloOperation = { type: 'solo', entryId, mode: 'solo--fullscreen' };
                  } else if (input.type === 'solo') {
                    // Un-solo the current entry and open it.
                    soloOperation = { type: 'unsolo', entryId };
                  }
                }
              }
            });

            // Run collected solo operations.
            if (soloOperation?.type === 'solo') {
              yield* invoke(Common.LayoutOperation.SetLayoutMode, {
                subject: soloOperation.entryId,
                mode: soloOperation.mode,
              });
            } else if (soloOperation?.type === 'unsolo') {
              yield* invoke(Common.LayoutOperation.SetLayoutMode, { mode: 'deck' });
              yield* invoke(Common.LayoutOperation.Open, { subject: [soloOperation.entryId] });
            }

            if (input.type === 'companion') {
              const companion = Function.pipe(
                Graph.getNode(graph, input.id),
                Option.map((node) =>
                  Graph.getConnections(graph, node.id)
                    .filter((n) => n.type === PLANK_COMPANION_TYPE)
                    .toSorted((a, b) => byPosition(a.properties, b.properties)),
                ),
                Option.flatMap((companions) => (companions.length > 0 ? Option.some(companions[0]) : Option.none())),
              );

              if (Option.isSome(companion)) {
                // TODO(wittjosiah): This should remember the previously selected companion.
                yield* invoke(DeckOperation.ChangeCompanion, { primary: input.id, companion: companion.value.id });
              }
            }
          }),
      }),

      //
      // ChangeCompanion
      //
      OperationResolver.make({
        operation: DeckOperation.ChangeCompanion,
        handler: (input) =>
          Effect.sync(() => {
            const state = context.getCapability(DeckCapabilities.MutableDeckState);
            // TODO(thure): Reactivity only works when creating a lexically new `activeCompanions`… Are these not proxy objects?
            if (input.companion === null) {
              const { [input.primary]: _, ...nextActiveCompanions } = state.deck.activeCompanions ?? {};
              state.deck.activeCompanions = nextActiveCompanions;
            } else {
              invariant(input.companion !== input.primary);
              state.deck.activeCompanions = {
                ...state.deck.activeCompanions,
                [input.primary]: input.companion,
              };
            }
          }),
      }),

      //
      // Close
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.Close,
        handler: (input) =>
          Effect.gen(function* () {
            const state = context.getCapability(DeckCapabilities.MutableDeckState);
            const attention = context.getCapability(AttentionCapabilities.Attention);
            const { invoke } = context.getCapability(Common.Capability.OperationInvoker);

            const active = state.deck.solo ? [state.deck.solo] : state.deck.active;
            const next = input.subject.reduce((acc, id) => closeEntry(acc, id), active);
            const toAttend = setActive({ next, state, attention });

            // Clear companions for closed entries.
            for (const id of input.subject) {
              if (state.deck.activeCompanions && id in state.deck.activeCompanions) {
                yield* invoke(DeckOperation.ChangeCompanion, { primary: id, companion: null });
              }
            }

            if (toAttend) {
              yield* Operation.schedule(Common.LayoutOperation.ScrollIntoView, { subject: toAttend });
            }
          }),
      }),

      //
      // Set
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.Set,
        handler: (input) =>
          Effect.gen(function* () {
            const state = context.getCapability(DeckCapabilities.MutableDeckState);
            const attention = context.getCapability(AttentionCapabilities.Attention);

            const toAttend = setActive({ next: input.subject as string[], state, attention });
            if (toAttend) {
              yield* Operation.schedule(Common.LayoutOperation.ScrollIntoView, { subject: toAttend });
            }
          }),
      }),

      //
      // ScrollIntoView
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.ScrollIntoView,
        handler: (input) =>
          Effect.sync(() => {
            const layout = context.getCapability(DeckCapabilities.MutableDeckState);
            layout.scrollIntoView = input.subject;
          }),
      }),
    ]);
  }),
);
