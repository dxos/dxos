//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';

import { Capability, Common } from '@dxos/app-framework';
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
    return Capability.contributes(Common.Capability.OperationResolver, [
      //
      // UpdateSidebar
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateSidebar,
        handler: Effect.fnUntraced(function* (input) {
          const state = yield* Common.Capability.getAtomValue(DeckCapabilities.State);
          const next = input.state ?? state.sidebarState;
          if (next !== state.sidebarState) {
            yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) => ({ ...s, sidebarState: next }));
          }
        }),
      }),

      //
      // UpdateComplementary
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateComplementary,
        handler: Effect.fnUntraced(function* (input) {
          const state = yield* Common.Capability.getAtomValue(DeckCapabilities.State);
          const panelChanged = state.complementarySidebarPanel !== input.subject;
          const next = input.subject ? 'expanded' : (input.state ?? state.complementarySidebarState);
          const stateChanged = next !== state.complementarySidebarState;

          if (panelChanged || stateChanged) {
            yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) => ({
              ...s,
              complementarySidebarPanel: panelChanged ? input.subject : s.complementarySidebarPanel,
              complementarySidebarState: stateChanged ? next : s.complementarySidebarState,
            }));
          }
        }),
      }),

      //
      // UpdateDialog
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.UpdateDialog,
        handler: Effect.fnUntraced(function* (input) {
          yield* Common.Capability.updateAtomValue(DeckCapabilities.EphemeralState, (s) => ({
            ...s,
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
        operation: Common.LayoutOperation.UpdatePopover,
        handler: Effect.fnUntraced(function* (input) {
          yield* Common.Capability.updateAtomValue(DeckCapabilities.EphemeralState, (s) => ({
            ...s,
            popoverOpen: input.state ?? Boolean(input.subject),
            popoverKind: input.kind ?? 'base',
            popoverTitle: input.kind === 'card' ? input.title : undefined,
            popoverContent:
              typeof input.subject === 'string'
                ? { component: input.subject, props: input.props }
                : input.subject
                  ? { subject: input.subject }
                  : null,
            popoverSide: input.side,
            popoverAnchor: input.variant === 'virtual' ? input.anchor : s.popoverAnchor,
            popoverAnchorId: input.variant !== 'virtual' ? input.anchorId : s.popoverAnchorId,
          }));
        }),
      }),

      //
      // AddToast
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.AddToast,
        handler: Effect.fnUntraced(function* (input) {
          yield* Common.Capability.updateAtomValue(DeckCapabilities.EphemeralState, (s) => ({
            ...s,
            toasts: [...s.toasts, input as Common.LayoutOperation.Toast],
          }));
        }),
      }),

      //
      // ShowUndo
      //
      OperationResolver.make({
        operation: Common.UndoOperation.ShowUndo,
        handler: Effect.fnUntraced(function* (input) {
          const historyTracker = yield* Capability.get(Common.Capability.HistoryTracker);

          const newUndoId = `show-undo-${Date.now()}`;
          // TODO(wittjosiah): Support undoing further back than the last action.
          yield* Common.Capability.updateAtomValue(DeckCapabilities.EphemeralState, (s) => {
            const filteredToasts = s.currentUndoId
              ? s.toasts.filter((toast) => toast.id !== s.currentUndoId)
              : s.toasts;

            const toast: Common.LayoutOperation.Toast = {
              id: newUndoId,
              title: input.message ?? ['undo available label', { ns: meta.id }],
              duration: 10_000,
              actionLabel: ['undo action label', { ns: meta.id }],
              actionAlt: ['undo action alt', { ns: meta.id }],
              closeLabel: ['undo close label', { ns: meta.id }],
              onAction: () => historyTracker.undoPromise(),
            };

            return {
              ...s,
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
        operation: Common.LayoutOperation.SetLayoutMode,
        filter: (input) => {
          if ('mode' in input) {
            return isLayoutMode(input.mode);
          }
          return true;
        },
        handler: Effect.fnUntraced(function* (input) {
          const state = yield* Common.Capability.getAtomValue(DeckCapabilities.State);
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

            yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) => {
              const newPreviousMode =
                currentMode !== input.mode ? { ...s.previousMode, [s.activeDeck]: currentMode } : s.previousMode;
              return {
                ...updateActiveDeck(s, deckUpdates),
                previousMode: newPreviousMode,
              };
            });
          } else if ('revert' in input) {
            const last = state.previousMode[state.activeDeck];
            const deckUpdates = computeModeUpdate(last ?? 'solo');
            yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) => updateActiveDeck(s, deckUpdates));
          } else {
            log.warn('Invalid layout mode', input);
          }
        }),
      }),

      //
      // SwitchWorkspace
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.SwitchWorkspace,
        handler: Effect.fnUntraced(function* (input) {
          const { graph } = yield* Capability.get(Common.Capability.AppGraph);

          {
            const state = yield* Common.Capability.getAtomValue(DeckCapabilities.State);
            // TODO(wittjosiah): This is a hack to prevent the previous deck from being set for pinned items.
            //   Ideally this should be worked into the data model in a generic way.
            const shouldUpdatePrevious = !state.activeDeck.startsWith('!');

            yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) => {
              const newDecks = s.decks[input.subject] ? s.decks : { ...s.decks, [input.subject]: { ...defaultDeck } };
              return {
                ...s,
                previousDeck: shouldUpdatePrevious ? s.activeDeck : s.previousDeck,
                activeDeck: input.subject,
                decks: newDecks,
              };
            });
          }

          {
            const state = yield* Common.Capability.getAtomValue(DeckCapabilities.State);
            const deck = state.decks[input.subject];
            invariant(deck, `Deck not found: ${input.subject}`);

            const first = deck.solo ? deck.solo : deck.active[0];
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
          }
        }),
      }),

      //
      // RevertWorkspace
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.RevertWorkspace,
        handler: Effect.fnUntraced(function* () {
          const state = yield* Common.Capability.getAtomValue(DeckCapabilities.State);
          yield* Operation.invoke(Common.LayoutOperation.SwitchWorkspace, { subject: state.previousDeck });
        }),
      }),

      //
      // Open
      //
      OperationResolver.make({
        operation: Common.LayoutOperation.Open,
        handler: Effect.fnUntraced(function* (input) {
          const { graph } = yield* Capability.get(Common.Capability.AppGraph);
          const attention = yield* Capability.get(AttentionCapabilities.Attention);
          const settings = yield* Common.Capability.getAtomValue(DeckCapabilities.Settings);

          {
            const state = yield* Common.Capability.getAtomValue(DeckCapabilities.State);
            if (input.workspace && state.activeDeck !== input.workspace) {
              yield* Operation.invoke(Common.LayoutOperation.SwitchWorkspace, { subject: input.workspace });
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
            yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) => updateActiveDeck(s, deckUpdates));
          }

          {
            const deck = yield* DeckCapabilities.getDeck();
            const ids = deck.solo ? [deck.solo] : deck.active;
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
          yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) =>
            updateActiveDeck(s, {
              plankSizing: {
                ...s.decks[s.activeDeck]?.plankSizing,
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
          const _state = yield* Common.Capability.getAtomValue(DeckCapabilities.State);
          const deck = yield* DeckCapabilities.getDeck();
          const attention = yield* Capability.get(AttentionCapabilities.Attention);
          const { graph } = yield* Capability.get(Common.Capability.AppGraph);

          // Collect layout operations to run after state updates.
          let soloOperation:
            | { type: 'solo'; entryId: string; mode: string }
            | { type: 'unsolo'; entryId: string }
            | undefined;

          if (input.type === 'increment-end' || input.type === 'increment-start') {
            const next = incrementPlank(deck.active, input);
            const { deckUpdates } = computeActiveUpdates({ next, deck, attention });
            yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) => updateActiveDeck(s, deckUpdates));
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
            yield* Operation.invoke(Common.LayoutOperation.SetLayoutMode, {
              subject: soloOperation.entryId,
              mode: soloOperation.mode,
            });
          } else if (soloOperation?.type === 'unsolo') {
            yield* Operation.invoke(Common.LayoutOperation.SetLayoutMode, { mode: 'deck' });
            yield* Operation.invoke(Common.LayoutOperation.Open, { subject: [soloOperation.entryId] });
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
            yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) =>
              updateActiveDeck(s, { activeCompanions: nextActiveCompanions }),
            );
          } else {
            const companion = input.companion;
            invariant(companion !== input.primary);
            yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) =>
              updateActiveDeck(s, {
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
        operation: Common.LayoutOperation.Close,
        handler: Effect.fnUntraced(function* (input) {
          const deck = yield* DeckCapabilities.getDeck();
          const attention = yield* Capability.get(AttentionCapabilities.Attention);

          const active = deck.solo ? [deck.solo] : deck.active;
          const next = input.subject.reduce((acc, id) => closeEntry(acc, id), active);
          const { deckUpdates, toAttend } = computeActiveUpdates({ next, deck, attention });
          yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) => updateActiveDeck(s, deckUpdates));

          // Clear companions for closed entries.
          for (const id of input.subject) {
            if (deck.activeCompanions && id in deck.activeCompanions) {
              yield* Operation.invoke(DeckOperation.ChangeCompanion, { primary: id, companion: null });
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
        handler: Effect.fnUntraced(function* (input) {
          const deck = yield* DeckCapabilities.getDeck();
          const attention = yield* Capability.get(AttentionCapabilities.Attention);

          const { deckUpdates, toAttend } = computeActiveUpdates({
            next: input.subject as string[],
            deck,
            attention,
          });
          yield* Common.Capability.updateAtomValue(DeckCapabilities.State, (s) => updateActiveDeck(s, deckUpdates));

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
        handler: Effect.fnUntraced(function* (input) {
          yield* Common.Capability.updateAtomValue(DeckCapabilities.EphemeralState, (s) => ({
            ...s,
            scrollIntoView: input.subject,
          }));
        }),
      }),
    ]);
  }),
);
