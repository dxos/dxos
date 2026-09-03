//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NotFound from '@dxos/app-toolkit/NotFound';
import * as Operation from '@dxos/compute/Operation';
import { EID, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';

import { DeckCapabilities } from '#types';

import {
  addSubjectsToActiveDeck,
  pushSubjectsToStack,
  resolveLevelOpen,
  resolveSeededPlanks,
  updatePlankNames,
} from '../layout.ts';
import { computeActiveUpdates, openableChildren, openCompanionPlank, resolveDeckSpec } from '../util/index.ts';
import { updateActiveDeck } from './helpers.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.Open> = LayoutOperation.Open.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      log('LayoutOperation.Open handler start');
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const attention = yield* Capability.get(AttentionCapabilities.Attention);
      const platform = yield* Capability.get(DeckCapabilities.Platform).pipe(
        Effect.catch(() => Effect.succeed('desktop' as const)),
      );

      // Validate navigation targets, redirecting to 404 if not found. Existence/loading is delegated
      // to the NavigationTargetLoader capability (contributed by plugin-client) so this layout plugin
      // has no direct client dependency; loading the object also materializes its graph node.
      const loaders = yield* Capability.getAll(AppCapabilities.NavigationTargetLoader).pipe(
        Effect.catch(() => Effect.succeed([])),
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
                  // Anything short of a store answering "no" counts as existing: a 404 here replaces
                  // the plank outright, so an unreachable edge must not be able to trigger one.
                  if ((yield* loader.load({ spaceId, entityId })) !== 'absent') {
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
          initial: resolveDeckSpec(
            input.subject[0] ? Option.getOrUndefined(AppGraph.getNode(graph, input.subject[0])) : undefined,
          )?.initial,
          addBesideOrigin,
          children: input.subject.length === 1 && input.subject[0] ? openableChildren(graph, input.subject[0]) : [],
        });

        // An open at a declared level: the level supplies the plank name and closes the levels below
        // it, so a chain like `mailbox / message / attachment` stays consistent without the caller
        // tracking any of it.
        const levelOpen =
          input.root && input.level && input.subject[0]
            ? resolveLevelOpen({
                active: deck.active,
                plankNames: deck.plankNames,
                spec: resolveDeckSpec(Option.getOrUndefined(AppGraph.getNode(graph, input.root))),
                root: input.root,
                level: input.level,
                subjectId: input.subject[0],
              })
            : undefined;

        let next: string[];
        if (platform === 'mobile') {
          // A stack has one open semantic: push (or surface) the subjects; solo-replace, pivots, and
          // seeded side-by-side planks are deck-geometry concepts with no stack analog.
          next = pushSubjectsToStack(deck.active, input.subject);
        } else if (levelOpen) {
          next = levelOpen.next;
        } else if (seeded) {
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

        const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);
        const { deckUpdates } = computeActiveUpdates({ next, deck, attention, flatten });
        // Rebound after the fact so the name follows whichever plank actually ended up holding it, and
        // so names whose plank this open closed are dropped rather than left dangling.
        // A level open binds the name the level owns; an ordinary open binds whatever the caller passed.
        const boundName = levelOpen?.name ?? input.name;
        const plankNames = updatePlankNames(
          deck.plankNames,
          next,
          boundName && input.subject[0] ? { name: boundName, plankId: input.subject[0] } : undefined,
        );
        // The companion follows a level swap: the new plank stands in for the replaced one, and closing
        // it mid-read would also narrow the deck, which the browser answers by clamping the scroll — a
        // one-frame snap measured at exactly the lost width.
        const companionPlanks =
          levelOpen?.replacedId && input.subject[0] && deck.companionPlanks.includes(levelOpen.replacedId)
            ? openCompanionPlank(deckUpdates.companionPlanks, flatten, input.subject[0])
            : deckUpdates.companionPlanks;
        yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
          updateActiveDeck(state, { ...deckUpdates, companionPlanks, plankNames }),
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
          const typename = Option.match(AppGraph.getNode(graph, subjectId), {
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
