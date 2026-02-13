//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capabilities, Capability, UndoOperation } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
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
  type DeckState,
  type DeckStateProps,
  type LayoutMode,
  PLANK_COMPANION_TYPE,
  defaultDeck,
  getMode,
  isLayoutMode,
} from '../../types';
import { computeActiveUpdates } from '../../util';

/**
 * Helper to update the active deck within the persisted state.
 */
const updateActiveDeck = (current: DeckStateProps, deckUpdates: Partial<DeckState>): DeckStateProps => {
  const currentDeck = current.decks[current.activeDeck];
  invariant(currentDeck, `Deck not found: ${current.activeDeck}`);
  return {
    ...current,
    decks: {
      ...current.decks,
      [current.activeDeck]: {
        ...currentDeck,
        ...deckUpdates,
      },
    },
  };
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.OperationResolver, [
      //
      // UpdateSidebar
      //
      OperationResolver.make({
        operation: LayoutOperation.UpdateSidebar,
        handler: Effect.fnUntraced(function* (input) {
          const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
          const next = input.state ?? state.sidebarState;
          if (next !== state.sidebarState) {
            yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => ({
              ...state,
              sidebarState: next,
            }));
          }
        }),
      }),

      //
      // UpdateComplementary
      //
      OperationResolver.make({
        operation: LayoutOperation.UpdateComplementary,
        handler: Effect.fnUntraced(function* (input) {
          const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
          const panelChanged = state.complementarySidebarPanel !== input.subject;
          const next = input.subject ? 'expanded' : (input.state ?? state.complementarySidebarState);
          const stateChanged = next !== state.complementarySidebarState;

          if (panelChanged || stateChanged) {
            yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => ({
              ...state,
              complementarySidebarPanel: panelChanged ? input.subject : state.complementarySidebarPanel,
              complementarySidebarState: stateChanged ? next : state.complementarySidebarState,
            }));
          }
        }),
      }),

      //
      // UpdateDialog
      //
      OperationResolver.make({
        operation: LayoutOperation.UpdateDialog,
        handler: Effect.fnUntraced(function* (input) {
          yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
            ...state,
            dialogOpen: input.state ?? Boolean(input.subject),
            dialogType: input.type ?? 'default',
            dialogBlockAlign: input.blockAlign ?? 'center',
            dialogOverlayClasses: input.overlayClasses,
            dialogOverlayStyle: input.overlayStyle,
            dialogContent: input.subject ? { component: input.subject, props: input.props } : null,
          }));
        }),
      }),

      //
      // UpdatePopover
      //
      OperationResolver.make({
        operation: LayoutOperation.UpdatePopover,
        handler: Effect.fnUntraced(function* (input) {
          yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
            ...state,
            popoverOpen: input.state ?? Boolean(input.subject),
            popoverKind: input.kind ?? 'base',
            popoverTitle: input.kind === 'card' ? input.title : undefined,
            popoverContentRef: input.subjectRef,
            popoverContent:
              typeof input.subject === 'string'
                ? { component: input.subject, props: input.props }
                : input.subject
                  ? { subject: input.subject }
                  : null,
            popoverSide: input.side,
            popoverAnchor: input.variant === 'virtual' ? input.anchor : state.popoverAnchor,
            popoverAnchorId: input.variant !== 'virtual' ? input.anchorId : state.popoverAnchorId,
          }));
        }),
      }),

      //
      // AddToast
      //
      OperationResolver.make({
        operation: LayoutOperation.AddToast,
        handler: Effect.fnUntraced(function* (input) {
          yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
            ...state,
            toasts: [...state.toasts, input as LayoutOperation.Toast],
          }));
        }),
      }),

      //
      // ShowUndo
      //
      OperationResolver.make({
        operation: UndoOperation.ShowUndo,
        handler: Effect.fnUntraced(function* (input) {
          const historyTracker = yield* Capability.get(Capabilities.HistoryTracker);

          const newUndoId = `show-undo-${Date.now()}`;
          // TODO(wittjosiah): Support undoing further back than the last action.
          yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => {
            const filteredToasts = state.currentUndoId
              ? state.toasts.filter((toast) => toast.id !== state.currentUndoId)
              : state.toasts;

            const toast: LayoutOperation.Toast = {
              id: newUndoId,
              title: input.message ?? ['undo available label', { ns: meta.id }],
              duration: 10_000,
              actionLabel: ['undo action label', { ns: meta.id }],
              actionAlt: ['undo action alt', { ns: meta.id }],
              closeLabel: ['undo close label', { ns: meta.id }],
              onAction: () => historyTracker.undoPromise(),
            };

            return {
              ...state,
              currentUndoId: newUndoId,
              toasts: [...filteredToasts, toast],
            };
          });
        }),
      }),

      //
      // SetLayoutMode
      //
      OperationResolver.make({
        operation: LayoutOperation.SetLayoutMode,
        filter: (input) => {
          if ('mode' in input) {
            return isLayoutMode(input.mode);
          }
          return true;
        },
        handler: Effect.fnUntraced(function* (input) {
          const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
          const deck = yield* DeckCapabilities.getDeck();

          const computeModeUpdate = (mode: LayoutMode, subject?: string): Partial<DeckState> => {
            const current = deck.solo ? [deck.solo] : deck.active;
            // When un-soloing, the solo entry is added to the deck.
            const next = (
              mode !== 'deck' ? [subject ?? deck.solo ?? deck.active[0]] : [...deck.active, deck.solo]
            ).filter(isNonNullable);

            const removed = current.filter((id: string) => !next.includes(id));
            const closed = Array.from(
              new Set([...deck.inactive.filter((id: string) => !next.includes(id)), ...removed]),
            );

            // Build deckUpdates object without mutating.
            const soloUpdate =
              mode !== 'deck' && next[0]
                ? { solo: next[0] }
                : mode === 'deck' && deck.solo
                  ? { solo: undefined, initialized: true }
                  : {};

            const fullscreenUpdate = mode === 'solo--fullscreen' ? { fullscreen: !deck.fullscreen } : {};

            return {
              inactive: closed,
              ...soloUpdate,
              ...fullscreenUpdate,
            };
          };

          if ('mode' in input) {
            const currentMode = getMode(deck);
            const deckUpdates = computeModeUpdate(
              input.mode as LayoutMode,
              'subject' in input ? input.subject : undefined,
            );

            yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => {
              const newPreviousMode =
                currentMode !== input.mode
                  ? { ...state.previousMode, [state.activeDeck]: currentMode }
                  : state.previousMode;
              return {
                ...updateActiveDeck(state, deckUpdates),
                previousMode: newPreviousMode,
              };
            });
          } else if ('revert' in input) {
            const last = state.previousMode[state.activeDeck];
            const deckUpdates = computeModeUpdate(last ?? 'solo');
            yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
              updateActiveDeck(state, deckUpdates),
            );
          } else {
            log.warn('Invalid layout mode', input);
          }
        }),
      }),

      //
      // SwitchWorkspace
      //
      OperationResolver.make({
        operation: LayoutOperation.SwitchWorkspace,
        handler: Effect.fnUntraced(function* (input) {
          const { graph } = yield* Capability.get(AppCapabilities.AppGraph);

          {
            const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
            // TODO(wittjosiah): This is a hack to prevent the previous deck from being set for pinned items.
            //   Ideally this should be worked into the data model in a generic way.
            const shouldUpdatePrevious = !state.activeDeck.startsWith('!');

            yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => {
              const newDecks = state.decks[input.subject]
                ? state.decks
                : { ...state.decks, [input.subject]: { ...defaultDeck } };
              return {
                ...state,
                previousDeck: shouldUpdatePrevious ? state.activeDeck : state.previousDeck,
                activeDeck: input.subject,
                decks: newDecks,
              };
            });
          }

          {
            const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
            const deck = state.decks[input.subject];
            invariant(deck, `Deck not found: ${input.subject}`);

            const first = deck.solo ? deck.solo : deck.active[0];
            if (first) {
              yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: first });
            } else {
              const [item] = Graph.getConnections(graph, input.subject).filter(
                (node) => !Node.isActionLike(node) && !node.properties.disposition,
              );
              if (item) {
                yield* Operation.schedule(LayoutOperation.Open, { subject: [item.id] });
              }
            }
          }
        }),
      }),

      //
      // RevertWorkspace
      //
      OperationResolver.make({
        operation: LayoutOperation.RevertWorkspace,
        handler: Effect.fnUntraced(function* () {
          const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
          yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: state.previousDeck });
        }),
      }),

      //
      // Open
      //
      OperationResolver.make({
        operation: LayoutOperation.Open,
        handler: Effect.fnUntraced(function* (input) {
          const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
          const attention = yield* Capability.get(AttentionCapabilities.Attention);
          const settings = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);

          {
            const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
            if (input.workspace && state.activeDeck !== input.workspace) {
              yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: input.workspace });
            }
          }

          let previouslyOpenIds: Set<string>;
          {
            const deck = yield* DeckCapabilities.getDeck();
            previouslyOpenIds = new Set<string>(deck.solo ? [deck.solo] : deck.active);
            const next = deck.solo
              ? input.subject.map((id) => createEntryId(id, input.variant))
              : input.subject.reduce(
                  (acc, entryId) =>
                    openEntry(acc, entryId, {
                      key: input.key,
                      positioning: input.positioning ?? settings?.newPlankPositioning,
                      pivotId: input.pivotId,
                      variant: input.variant,
                    }),
                  deck.active,
                );

            const { deckUpdates, toAttend: _toAttend } = computeActiveUpdates({ next, deck, attention });
            yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
              updateActiveDeck(state, deckUpdates),
            );
          }

          {
            const deck = yield* DeckCapabilities.getDeck();
            const ids = deck.solo ? [deck.solo] : deck.active;
            const newlyOpen = ids.filter((i: string) => !previouslyOpenIds.has(i));

            if (input.scrollIntoView !== false && (newlyOpen[0] ?? input.subject[0])) {
              yield* Operation.schedule(LayoutOperation.ScrollIntoView, {
                subject: newlyOpen[0] ?? input.subject[0],
              });
            }

            if (newlyOpen[0] ?? input.subject[0]) {
              yield* Operation.schedule(LayoutOperation.Expose, { subject: newlyOpen[0] ?? input.subject[0] });
            }

            // Send analytics events for newly opened items.
            for (const subjectId of newlyOpen) {
              const typename = Option.match(Graph.getNode(graph, subjectId), {
                onNone: () => undefined,
                onSome: (node) => {
                  const active = node.data;
                  return Obj.isObject(active) ? Obj.getTypename(active) : undefined;
                },
              });
              yield* Operation.schedule(ObservabilityOperation.SendEvent, {
                name: 'navigation.activate',
                properties: { subjectId, typename },
              });
            }
          }
        }),
      }),

      //
      // UpdatePlankSize
      //
      OperationResolver.make({
        operation: DeckOperation.UpdatePlankSize,
        handler: Effect.fnUntraced(function* (input) {
          yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
            updateActiveDeck(state, {
              plankSizing: {
                ...state.decks[state.activeDeck]?.plankSizing,
                [input.id]: input.size,
              },
            }),
          );
        }),
      }),

      //
      // Adjust
      //
      OperationResolver.make({
        operation: DeckOperation.Adjust,
        handler: Effect.fnUntraced(function* (input) {
          const _state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
          const deck = yield* DeckCapabilities.getDeck();
          const attention = yield* Capability.get(AttentionCapabilities.Attention);
          const { graph } = yield* Capability.get(AppCapabilities.AppGraph);

          // Collect layout operations to run after state updates.
          let soloOperation:
            | { type: 'solo'; entryId: string; mode: string }
            | { type: 'unsolo'; entryId: string }
            | undefined;

          if (input.type === 'increment-end' || input.type === 'increment-start') {
            const next = incrementPlank(deck.active, input);
            const { deckUpdates } = computeActiveUpdates({ next, deck, attention });
            yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
              updateActiveDeck(state, deckUpdates),
            );
          }

          if (input.type.startsWith('solo')) {
            const entryId = input.id;
            if (!deck.solo) {
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

          // Run collected solo operations.
          if (soloOperation?.type === 'solo') {
            yield* Operation.invoke(LayoutOperation.SetLayoutMode, {
              subject: soloOperation.entryId,
              mode: soloOperation.mode,
            });
          } else if (soloOperation?.type === 'unsolo') {
            yield* Operation.invoke(LayoutOperation.SetLayoutMode, { mode: 'deck' });
            yield* Operation.invoke(LayoutOperation.Open, { subject: [soloOperation.entryId] });
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
              yield* Operation.invoke(DeckOperation.ChangeCompanion, {
                primary: input.id,
                companion: companion.value.id,
              });
            }
          }
        }),
      }),

      //
      // ChangeCompanion
      //
      OperationResolver.make({
        operation: DeckOperation.ChangeCompanion,
        handler: Effect.fnUntraced(function* (input) {
          const deck = yield* DeckCapabilities.getDeck();
          if (input.companion === null) {
            const { [input.primary]: _, ...nextActiveCompanions } = deck.activeCompanions ?? {};
            yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
              updateActiveDeck(state, { activeCompanions: nextActiveCompanions }),
            );
          } else {
            const companion = input.companion;
            invariant(companion !== input.primary);
            yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
              updateActiveDeck(state, {
                activeCompanions: {
                  ...deck.activeCompanions,
                  [input.primary]: companion,
                },
              }),
            );
          }
        }),
      }),

      //
      // Close
      //
      OperationResolver.make({
        operation: LayoutOperation.Close,
        handler: Effect.fnUntraced(function* (input) {
          const deck = yield* DeckCapabilities.getDeck();
          const attention = yield* Capability.get(AttentionCapabilities.Attention);

          const active = deck.solo ? [deck.solo] : deck.active;
          const next = input.subject.reduce((acc, id) => closeEntry(acc, id), active);
          const { deckUpdates, toAttend } = computeActiveUpdates({ next, deck, attention });
          yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => updateActiveDeck(state, deckUpdates));

          // Clear companions for closed entries.
          for (const id of input.subject) {
            if (deck.activeCompanions && id in deck.activeCompanions) {
              yield* Operation.invoke(DeckOperation.ChangeCompanion, { primary: id, companion: null });
            }
          }

          if (toAttend) {
            yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: toAttend });
          }
        }),
      }),

      //
      // Set
      //
      OperationResolver.make({
        operation: LayoutOperation.Set,
        handler: Effect.fnUntraced(function* (input) {
          const deck = yield* DeckCapabilities.getDeck();
          const attention = yield* Capability.get(AttentionCapabilities.Attention);

          const { deckUpdates, toAttend } = computeActiveUpdates({
            next: input.subject as string[],
            deck,
            attention,
          });
          yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => updateActiveDeck(state, deckUpdates));

          if (toAttend) {
            yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: toAttend });
          }
        }),
      }),

      //
      // ScrollIntoView
      //
      OperationResolver.make({
        operation: LayoutOperation.ScrollIntoView,
        handler: Effect.fnUntraced(function* (input) {
          yield* Capabilities.updateAtomValue(DeckCapabilities.EphemeralState, (state) => ({
            ...state,
            scrollIntoView: input.subject,
          }));
        }),
      }),
    ]);
  }),
);
