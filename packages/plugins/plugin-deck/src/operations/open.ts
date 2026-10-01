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
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';

import { CompanionViewState, DeckCapabilities } from '#types';

import { applyWorkspace, computeActiveUpdates, currentNavigation, navigateDeck } from '../url/index.ts';
import {
  addSubjectsToActiveDeck,
  isCompanionOpen,
  matchOpenEntities,
  openCompanionPlank,
  pushSubjectsToStack,
  resolveDetailOpen,
  updateActiveDeck,
  withViewTransition,
} from '../util/index.ts';

const handler: Operation.WithHandler<typeof LayoutOperation.Open> = LayoutOperation.Open.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      log('LayoutOperation.Open handler start');
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
      const attention = yield* Capability.get(AttentionCapabilities.Attention);
      const platform = yield* Capability.get(DeckCapabilities.Platform).pipe(
        Effect.catch(() => Effect.succeed('desktop' as const)),
      );

      for (const subjectId of input.subject) {
        AppGraph.expandPath(graph, subjectId);
      }

      const workspaceToEnter = yield* Effect.map(Capabilities.getAtomValue(DeckCapabilities.State), (state) =>
        input.workspace && state.activeDeck !== input.workspace ? input.workspace : undefined,
      );
      if (workspaceToEnter) {
        yield* withViewTransition(applyWorkspace(workspaceToEnter));
      }

      // The same object can appear under several graph paths (two collections, or a collection and its
      // type). A plain navigation moves its open plank onto the path asked for; any other open reuses
      // the plank where it is rather than opening the object twice.
      const rehome = (input.disposition ?? 'solo') === 'solo' && !input.modifiers?.shift;
      const matched = matchOpenEntities({
        active: (yield* DeckCapabilities.getDeck()).active,
        subjects: input.subject,
        entityOf: (id) => Option.getOrUndefined(GraphPath.tryGetEid(graph, id)),
        rehome,
      });
      input = { ...input, subject: matched.subjects };

      // Compute the next active deck state and apply it. Dispositions:
      // - 'solo' (default): navigate — the deck becomes just the subjects, unless they are all already
      //   open (scroll-into-view only).
      // - 'add': always insert the subjects as new planks, immediately after `pivotId` when provided,
      //   else at the end; never replaces. A card passes its own plank as `pivotId` (see
      //   `useCardPivot`), so opened objects appear beside the plank the card lives in.
      // - 'auto': follow the deck — add beside the origin (`pivotId`, falling back to the attended
      //   plank) when already sliding (2+ planks), otherwise navigate solo. In-plank inline references
      //   use this so they grow a sliding deck but replace a solo one.
      // - 'detail': the subject is `pivotId`'s detail (see `resolveDetailOpen`); with no open pivot it
      //   adds like 'add'.
      // Holding shift forces any disposition into an add (callers forward the raw modifier rather than
      // encoding the policy). Only 'auto' falls back to the attended plank; a shift-forced add from the
      // nav-tree (a 'solo' gesture with no pivot) appends at the end.
      const navigateSolo = (active: readonly string[]): string[] =>
        input.subject.every((id) => active.includes(id)) ? [...active] : [...input.subject];

      let previouslyOpenIds: Set<string>;
      /** The plank the deck write below focuses, so the followups know whether one carried the intent. */
      let scrolled: string | undefined;
      /** Whether the subject went into the companion, where there is no plank to scroll to or expose. */
      let shownInCompanion = false;
      {
        const before = yield* DeckCapabilities.getDeck();
        previouslyOpenIds = new Set<string>(before.active);
        // A re-homed plank is the same plank under its new path, not one this open closes.
        const deck = {
          ...before,
          active: matched.active,
          companionPlanks: before.companionPlanks?.map((id) => matched.moved.get(id) ?? id),
        };

        const disposition = input.disposition ?? 'solo';
        const shift = !!input.modifiers?.shift;
        const sliding = deck.active.length >= 2;
        const anchorToOrigin = disposition === 'auto';
        const { flatten } = yield* Capabilities.getAtomValue(DeckCapabilities.Settings);

        // A list's selected row: it stands in for whatever the pivot last opened as its detail.
        const detailOpen =
          disposition === 'detail' && !shift && input.pivotId && input.subject[0]
            ? resolveDetailOpen({
                active: deck.active,
                plankNames: deck.plankNames,
                pivot: input.pivotId,
                subject: input.subject[0],
                flatten,
                stack: platform === 'mobile',
              })
            : undefined;
        // A detail whose pivot is not open has nothing to stand beside but the origin.
        const addBesideOrigin =
          shift || disposition === 'add' || disposition === 'detail' || (anchorToOrigin && sliding);

        let next: string[];
        if (detailOpen) {
          next = detailOpen.next;
        } else if (platform === 'mobile') {
          // A stack has one open semantic: push (or surface) the subjects; solo-replace and pivots are
          // deck-geometry concepts with no stack analog.
          next = pushSubjectsToStack(deck.active, input.subject);
        } else if (addBesideOrigin) {
          const [attendedId] = anchorToOrigin ? attention.getCurrent() : [];
          const pivotId = input.pivotId ?? (attendedId && deck.active.includes(attendedId) ? attendedId : undefined);
          // A named open reuses the plank already holding that name, the way a browser tab is reused; shift
          // asks for a new plank, so it does not.
          const holder = input.name ? deck.plankNames[input.name] : undefined;
          const replaceId = !shift && holder && deck.active.includes(holder) ? holder : undefined;
          next = addSubjectsToActiveDeck(deck.active, input.subject, { pivotId, replaceId });
        } else {
          next = navigateSolo(deck.active);
        }

        const { deckUpdates } = computeActiveUpdates({ next, deck, attention, flatten });
        let companionPlanks = deckUpdates.companionPlanks;
        const main = next.at(-1);
        if (detailOpen?.inCompanion && main) {
          const viewState = yield* Capability.get(AttentionCapabilities.ViewState);
          viewState.update(CompanionViewState.aspect, CompanionViewState.CONTEXT, (prev) => ({
            ...prev,
            variant: CompanionViewState.DETAIL_VARIANT,
          }));
          companionPlanks = openCompanionPlank(companionPlanks, flatten, main);
        } else if (
          detailOpen?.replacedId &&
          input.subject[0] &&
          isCompanionOpen(deck.companionPlanks, flatten, detailOpen.replacedId)
        ) {
          // The companion follows a detail swap: the new plank stands in for the replaced one, and
          // closing it mid-read would also narrow the deck, which the browser answers by clamping the
          // scroll — a one-frame snap measured at exactly the lost width.
          companionPlanks = openCompanionPlank(companionPlanks, flatten, input.subject[0]);
        }
        // The name follows whichever plank ended up holding it; `applyActive` prunes names whose plank closed.
        const holder = input.subject[0];
        const plankNames =
          detailOpen?.plankNames ??
          (input.name && holder && next.includes(holder) ? { ...deck.plankNames, [input.name]: holder } : undefined);
        if (plankNames) {
          yield* Capabilities.updateAtomValue(DeckCapabilities.State, (state) =>
            updateActiveDeck(state, { plankNames }),
          );
        }
        shownInCompanion = !!detailOpen?.inCompanion;
        const current = yield* currentNavigation();
        const workspace = (input.workspace && GraphPath.getWorkspaceToken(input.workspace)) || current.workspace;
        // Subjects the graph has not built yet open at once: the URL projection shows them while they
        // load and turns any that do not exist into not-found. The focus intent rides on the write that
        // mounts the plank, so its first painted frame is already attended.
        scrolled =
          input.scrollIntoView === false ? undefined : deckUpdates.active.find((id) => !previouslyOpenIds.has(id));
        yield* navigateDeck({
          workspace,
          active: deckUpdates.active,
          companionPlanks,
          intent: { scrollIntoView: scrolled, focus: input.focus, transition: !workspaceToEnter },
        });
      }

      {
        const deck = yield* DeckCapabilities.getDeck();
        const newlyOpen = deck.active.filter((i: string) => !previouslyOpenIds.has(i));

        // Nothing newly open means no URL changed, so no write carried the intent above.
        const shown = shownInCompanion ? undefined : input.subject[0];
        if (scrolled === undefined && input.scrollIntoView !== false && shown) {
          yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: shown, focus: input.focus });
        }

        if (newlyOpen[0] ?? shown) {
          yield* Operation.schedule(LayoutOperation.Expose, { subject: newlyOpen[0] ?? shown });
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

      return input.subject;
    }),
  ),
);

export default handler;
