//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, DeckSpec, GraphPath, LayoutOperation, NotFound } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { EID, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Graph } from '@dxos/plugin-graph';
import { ObservabilityOperation } from '@dxos/plugin-observability';

import { addSubjectsToActiveDeck, resolveSeededPlanks, updatePlankNames } from '../layout';
import { DeckCapabilities } from '../types';
import { computeActiveUpdates, openableChildren } from '../util';
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
      // subject to the existing deck entry so the already-open check matches by identity.
      {
        const deck = yield* DeckCapabilities.getDeck();
        const active = deck.active;
        if (active.length > 0 && input.subject.length > 0) {
          // Build EID → deck item ID map for active items.
          const deckEidMap = new Map<string, string>();
          for (const deckId of active) {
            const eid = GraphPath.tryGetEid(graph, deckId);
            if (Option.isSome(eid)) {
              deckEidMap.set(eid.value, deckId);
            }
          }

          // Remap subjects whose EID matches an existing deck item.
          if (deckEidMap.size > 0) {
            const remapped = input.subject.map((subjectId) => {
              const eid = GraphPath.tryGetEid(graph, subjectId);
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

      // Compute the next active deck state and apply it. Dispositions:
      // - 'solo' (default): navigate — the deck becomes just the subjects, unless they are all already
      //   open (scroll-into-view only).
      // - 'add': always insert the subjects as new planks, immediately after `pivotId` when provided,
      //   else at the end; never replaces. A card passes its own plank as `pivotId` (see
      //   `useCardPivot`), so opened objects appear beside the plank the card lives in.
      // - 'auto': follow the deck — add beside the origin (`pivotId`, falling back to the attended
      //   plank) when already sliding (2+ planks), otherwise navigate solo. In-plank inline references
      //   use this so they grow a sliding deck but replace a solo one.
      // Holding shift forces any disposition into an add (callers forward the raw modifier rather than
      // encoding the policy). Only 'auto' falls back to the attended plank; a shift-forced add from the
      // nav-tree (a 'solo' gesture with no pivot) appends at the end.
      const navigateSolo = (active: readonly string[]): string[] =>
        input.subject.every((id) => active.includes(id)) ? [...active] : [...input.subject];

      let previouslyOpenIds: Set<string>;
      {
        const deck = yield* DeckCapabilities.getDeck();
        previouslyOpenIds = new Set<string>(deck.active);

        const disposition = input.disposition ?? 'solo';
        const shift = !!input.modifiers?.shift;
        const sliding = deck.active.length >= 2;
        const anchorToOrigin = disposition === 'auto';
        const addBesideOrigin = shift || disposition === 'add' || (anchorToOrigin && sliding);

        // A type may declare what its deck opens (`AppAnnotation.DeckAnnotation`); a Collection opens
        // the documents it contains rather than a plank showing the collection itself.
        const seeded = resolveSeededPlanks({
          initial: DeckSpec.fromNode(
            input.subject[0] ? Option.getOrUndefined(Graph.getNode(graph, input.subject[0])) : undefined,
          )?.initial,
          addBesideOrigin,
          children: input.subject.length === 1 && input.subject[0] ? openableChildren(graph, input.subject[0]) : [],
        });

        let next: string[];
        if (seeded) {
          next = seeded;
        } else if (addBesideOrigin) {
          const [attendedId] = anchorToOrigin ? attention.getCurrent() : [];
          const pivotId = input.pivotId ?? (attendedId && deck.active.includes(attendedId) ? attendedId : undefined);
          // A named open reuses the plank already holding that name, the way a browser tab is reused.
          const replaceId = input.name ? deck.plankNames[input.name] : undefined;
          next = addSubjectsToActiveDeck(deck.active, input.subject, { pivotId, replaceId });
        } else {
          next = navigateSolo(deck.active);
        }

        const { deckUpdates } = computeActiveUpdates({ next, deck, attention });
        // Rebound after the fact so the name follows whichever plank actually ended up holding it, and
        // so names whose plank this open closed are dropped rather than left dangling.
        const plankNames = updatePlankNames(
          deck.plankNames,
          next,
          input.name && input.subject[0] ? { name: input.name, plankId: input.subject[0] } : undefined,
        );
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, { ...deckUpdates, plankNames }),
        );
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
