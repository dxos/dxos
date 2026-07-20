//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, NotFound, Paths } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { EID, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Graph } from '@dxos/plugin-graph';
import { ObservabilityOperation } from '@dxos/plugin-observability';

import { openSubjectsOnActiveDeck, replaceSubjectsOnActiveDeck, resolveDisposition } from '../layout';
import { DeckCapabilities } from '../types';
import { computeActiveUpdates } from '../util';
import { updateActiveDeck } from './helpers';

const handler: Operation.WithHandler<typeof LayoutOperation.Open> = LayoutOperation.Open.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      log('LayoutOperation.Open handler start');
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const attention = yield* Capability.get(AttentionCapabilities.Attention);

      // Validate navigation targets, redirecting to 404 if not found. Existence/loading is delegated
      // to the NavigationTargetLoader capability (contributed by plugin-client) so this layout plugin
      // has no direct client dependency; loading the object also materializes its graph node.
      const loaders = yield* Capability.getAll(AppCapabilities.NavigationTargetLoader).pipe(
        Effect.catchAll(() => Effect.succeed([])),
      );
      const checkExistence: NotFound.ExistenceChecker | undefined =
        loaders.length > 0
          ? (id: EID.EID) =>
              Effect.gen(function* () {
                const spaceId = EID.getSpaceId(id);
                const entityId = EID.getEntityId(id);
                if (!spaceId || !entityId) {
                  return false;
                }
                for (const loader of loaders) {
                  if (yield* loader.load({ spaceId, entityId })) {
                    return true;
                  }
                }
                return false;
              })
          : undefined;

      // Immediate: skip 404 / resolver checks but still expand the path (same as validate’s first step).
      if (input.navigation === 'immediate') {
        for (const subjectId of input.subject) {
          NotFound.expandPath(graph, subjectId);
        }
      }

      const validatedSubjects = yield* Effect.all(
        input.subject.map((subjectId) =>
          input.navigation === 'immediate'
            ? Effect.succeed(subjectId)
            : NotFound.validateNavigationTarget({
                graph,
                subjectId,
                checkLocalExistence: checkExistence,
              }),
        ),
      );
      input = { ...input, subject: validatedSubjects };

      {
        const state = yield* Capabilities.getAtomValue(DeckCapabilities.State);
        if (input.workspace && state.activeDeck !== input.workspace) {
          yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: input.workspace });
        }
      }

      // Dedup subjects against the active deck using EID identity.
      // The same object can appear under different graph paths (e.g., via collections vs types).
      // Resolve each subject's EID and, if it matches an already-open deck item, remap the
      // subject to the existing deck entry so that openEntry's exact-match check succeeds.
      {
        const deck = yield* DeckCapabilities.getDeck();
        const active = deck.active;
        if (active.length > 0 && input.subject.length > 0) {
          // Build EID → deck item ID map for active items.
          const deckEidMap = new Map<string, string>();
          for (const deckId of active) {
            const eid = Paths.tryGetEid(graph, deckId);
            if (Option.isSome(eid)) {
              deckEidMap.set(eid.value, deckId);
            }
          }

          // Remap subjects whose EID matches an existing deck item.
          if (deckEidMap.size > 0) {
            const remapped = input.subject.map((subjectId) => {
              const eid = Paths.tryGetEid(graph, subjectId);
              if (Option.isSome(eid)) {
                const existing = deckEidMap.get(eid.value);
                if (existing && existing !== subjectId) {
                  return existing;
                }
              }
              return subjectId;
            });
            input = { ...input, subject: remapped };
          }
        }
      }

      // Compute the next active deck state and apply it. The resolved disposition decides whether
      // subjects are pushed (openSubjectsOnActiveDeck) or spliced in place (replaceSubjectsOnActiveDeck)
      // at the pivot/attended plank.
      let previouslyOpenIds: Set<string>;
      {
        const deck = yield* DeckCapabilities.getDeck();
        previouslyOpenIds = new Set<string>(deck.active);

        const settings = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);
        const disposition = resolveDisposition(settings?.navigationDefault ?? 'replace', input.disposition);

        let next: string[];
        if (disposition === 'new-plank') {
          next = openSubjectsOnActiveDeck(deck.active, input.subject, {
            pivotId: input.pivotId,
            key: input.key,
          });
        } else {
          const pivotIndex = input.pivotId ? deck.active.findIndex((id) => id === input.pivotId) : -1;
          const [attendedId] = Array.from(attention.getCurrent());
          const attendedIndex = attendedId ? deck.active.findIndex((id) => id === attendedId) : -1;
          const index = pivotIndex !== -1 ? pivotIndex : attendedIndex !== -1 ? attendedIndex : 0;
          next = replaceSubjectsOnActiveDeck(deck.active, input.subject, { index });
        }

        const { deckUpdates } = computeActiveUpdates({ next, deck, attention });
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) => updateActiveDeck(state, deckUpdates));
      }

      // Schedule side-effects for the newly opened items: scroll into view, expose in
      // the navigation sidebar, and emit observability events.
      // When nothing is newly opened (subject was already visible), the fallback
      // `input.subject[0]` still triggers scroll and expose so the user is taken there.
      {
        const deck = yield* DeckCapabilities.getDeck();
        const newlyOpen = deck.active.filter((i: string) => !previouslyOpenIds.has(i));

        if (input.scrollIntoView !== false && (newlyOpen[0] ?? input.subject[0])) {
          yield* Operation.schedule(LayoutOperation.ScrollIntoView, {
            subject: newlyOpen[0] ?? input.subject[0],
          });
        }

        if (newlyOpen[0] ?? input.subject[0]) {
          yield* Operation.schedule(LayoutOperation.Expose, { subject: newlyOpen[0] ?? input.subject[0] });
        }

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

      return validatedSubjects;
    }),
  ),
);

export default handler;
