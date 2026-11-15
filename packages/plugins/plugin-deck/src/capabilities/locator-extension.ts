//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type EID } from '@dxos/keys';
import { log } from '@dxos/log';

import { DeckCapabilities } from '#types';

import { DeckNamespace } from '../namespace.ts';

/** Where the deck is in one space: its `LocatorExtension`'s value there. */
export type DeckLocation = {
  /** The plank the deck is scrolled to, when it is in the space. */
  front?: string;
  /** Its planks in the space whose companion is open. */
  companions: string[];
  /** The companion tab it shows them in. */
  variant?: string;
};

/** How long planks opened for the leader have to mount; their scroll and anchors are sent again on every tick meanwhile. */
const MOUNT_TIMEOUT = 5_000;

const TICK_INTERVAL = 500;

const isString = (value: unknown): value is string => typeof value === 'string';

/** Narrows a leader's value, which arrives as opaque JSON, to a {@link DeckLocation}. */
export const parseDeckLocation = (value: unknown): DeckLocation | undefined => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { front, companions, variant } = value as Record<string, unknown>;
  return {
    ...(isString(front) && { front }),
    companions: Array.isArray(companions) ? companions.filter(isString) : [],
    ...(isString(variant) && { variant }),
  };
};

const isSamePlanks = (a?: readonly string[], b?: readonly string[]) =>
  a === b || (a?.length === b?.length && !!a?.every((path, index) => path === b?.[index]));

/**
 * What this deck shows of the leader: their attended object, the deck mirrored from theirs (when this one lays planks
 * side by side), and its front plank.
 */
type Shown = {
  key: EID.EID;
  path?: string;
  localPath?: string;
  planks?: readonly string[];
  front?: string;
  revealUntil: number;
  /** Set when the deck could not open the view, so the next update opens it again. */
  retry?: boolean;
  /** The leader's companions as last mirrored, so an unchanged report opens nothing again. */
  companions?: string;
};

/**
 * The deck's `LocatorExtension`. Its value in a space is its front plank there and its planks with their companion
 * open. Following, it opens what the leader shows: a deck that lays planks side by side mirrors the leader's deck, their
 * planks, the plank they are scrolled to and their companions; a flat deck opens the plank the leader attends, at the
 * leader's path. Neither moves the caret or focus.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const { invoke } = yield* Capabilities.OperationInvoker;
    const registry = yield* Capabilities.AtomRegistry;
    const layoutAtom = yield* AppCapabilities.Layout;
    const deckViewAtom = yield* DeckCapabilities.View;
    const appGraphAtom = capabilities.atom(AppCapabilities.AppGraph);

    const location = Atom.make((get) => {
      const { active } = get(layoutAtom);
      const { front, companions } = get(deckViewAtom);
      const bySpace: Record<string, DeckLocation> = {};
      for (const spaceId of new Set(active.flatMap((plank) => GraphPath.getSpaceIdFromPath(plank) ?? []))) {
        const inSpace = (path: string) => GraphPath.getSpaceIdFromPath(path) === spaceId;
        bySpace[spaceId] = {
          ...(front && inSpace(front) && { front }),
          companions: companions.items.filter(inSpace),
          ...(companions.variant && { variant: companions.variant }),
        };
      }
      return bySpace;
    });

    // Whether this deck has a URL binding for a graph path; the deck drops a path it cannot represent.
    const isBound = (path: string) => {
      const [builder] = registry.get(appGraphAtom);
      return !!builder && Option.isSome(PathResolution.representNode(builder, path));
    };

    const findOpenPath = (key: EID.EID) =>
      registry.get(layoutAtom).active.find((path) => GraphPath.getEidFromPath(path) === key);

    const follow = (viewAtom: Atom.Atom<AppCapabilities.FollowView>) =>
      Effect.gen(function* () {
        const showing = Atom.make(true);
        const unmountShowing = registry.mount(showing);
        const setShowing = (value: boolean) => {
          if (registry.get(showing) !== value) {
            registry.set(showing, value);
          }
        };

        let shown: Shown | undefined;
        let navigating: Fiber.Fiber<void> | undefined;

        const retryLater = (target: Shown, err?: unknown) =>
          Effect.sync(() => {
            if (err !== undefined) {
              log.warn('follow could not open what the leader shows', { err });
            }
            target.retry = true;
            setShowing(false);
          });

        // Opens what the leader shows unless this deck shows it already; it waits while the attended object is
        // unavailable, as one the leader just made may not have replicated.
        const navigate = (spaceId: string, target: Shown) =>
          Effect.gen(function* () {
            if (!target.localPath) {
              return yield* retryLater(target);
            }

            if (target.planks) {
              const workspace = GraphPath.getSpacePath(spaceId);
              if (registry.get(layoutAtom).workspace !== workspace) {
                yield* invoke(LayoutOperation.SwitchWorkspace, { subject: workspace });
              }
              // The deck leaves out a plank it cannot bind, so a deck short only of those already shows the leader's.
              if (!isSamePlanks(registry.get(layoutAtom).active, target.planks.filter(isBound))) {
                yield* invoke(LayoutOperation.Set, { subject: [...target.planks], focus: false });
              }
            } else {
              // A flat deck shows its front plank, at the leader's path where this deck has a URL binding for it, since
              // the deck drops a path it cannot represent; otherwise at the object's own path.
              const leaderPath = target.path && isBound(target.path) ? target.path : undefined;
              const shownPath = leaderPath ?? findOpenPath(target.key);
              if (!shownPath || registry.get(deckViewAtom).front !== shownPath) {
                // A flat deck shows its last plank, and Open leaves a plank it already holds where it is, so the
                // planks stacked after the leader's object come off first, as a breadcrumb would.
                const { active } = registry.get(layoutAtom);
                const index = active.findIndex((plank) => GraphPath.getEidFromPath(plank) === target.key);
                if (index >= 0 && index < active.length - 1) {
                  yield* invoke(LayoutOperation.Set, { subject: active.slice(0, index + 1), focus: false });
                }
                yield* invoke(LayoutOperation.Open, { subject: [leaderPath ?? target.localPath], focus: false });
              }
            }

            // Showing the view only once the deck has it keeps a failing retry from re-entering `update` at once, and
            // the planks it opened mount from now, however long it waited.
            target.revealUntil = Date.now() + MOUNT_TIMEOUT;
            setShowing(true);
          }).pipe(
            // A failed operation can reach here as a defect; an interrupt is a newer view or a stop, not a failure.
            Effect.catch((err) => retryLater(target, err)),
            Effect.catchDefect((err) => retryLater(target, err)),
          );

        const update = () => {
          const view = registry.get(viewAtom);
          const now = Date.now();
          const layout = registry.get(layoutAtom);
          const deck = registry.get(deckViewAtom);
          const leader = parseDeckLocation(view.value);
          const { key, path, localPath } = view.attended;
          // A leader that reported no planks is followed as a flat deck follows, by the object they attend.
          const planks = !deck.flat && view.active.length > 0 ? view.active : undefined;
          const changed = !shown || key !== shown.key || path !== shown.path || !isSamePlanks(planks, shown.planks);
          if (!shown || changed) {
            shown = { key, path, planks, revealUntil: now + MOUNT_TIMEOUT };
          }
          shown.localPath = localPath;
          if (changed || shown.retry) {
            shown.retry = false;
            if (navigating) {
              Effect.runFork(Fiber.interrupt(navigating));
            }
            navigating = Effect.runFork(navigate(view.spaceId, shown));
          }

          // Planks opened for the leader mount late, so their scroll and companions are sent again until they have.
          const mounting = now < shown.revealUntil;
          // The leader's front when this deck holds it. A front this deck has no binding for is never held, so once the
          // deck holds every plank of theirs it can bind, it slides to one of theirs it holds, the first after the
          // front, else the last before it; until then the deck still shows its own planks and does not slide.
          const frontIndex = planks && leader?.front ? planks.indexOf(leader.front) : -1;
          const holdsLeaderDeck = !!planks?.every((plank) => layout.active.includes(plank) || !isBound(plank));
          const front =
            planks && frontIndex >= 0
              ? (holdsLeaderDeck
                  ? [...planks.slice(frontIndex), ...planks.slice(0, frontIndex).reverse()]
                  : [planks[frontIndex]]
                ).find((plank) => layout.active.includes(plank))
              : undefined;
          if (front && (front !== shown.front || (mounting && deck.front !== front))) {
            shown.front = front;
            Effect.runFork(
              invoke(LayoutOperation.ScrollIntoView, { subject: front, focus: false }).pipe(
                Effect.catch((err) => Effect.sync(() => log.warn('follow scroll failed', { err }))),
              ),
            );
          }

          // Companions are content: each plank shown of the leader opens the companion they have open there, in their
          // tab, and closes one they closed. A flat deck holds the leader's plank at its own path for the same object.
          if (leader) {
            const leaderCompanions = new Set(leader.companions);
            const variant = leader.variant;
            const pairs: [string, string | undefined][] = planks
              ? planks.map((plank) => [plank, plank])
              : path
                ? [[path, findOpenPath(key)]]
                : [];
            const signature = JSON.stringify([
              pairs.map(([leaderPlank]) => leaderCompanions.has(leaderPlank)),
              variant,
            ]);
            if (signature !== shown.companions || mounting) {
              shown.companions = signature;
              for (const [leaderPlank, plank] of pairs) {
                if (!plank || !layout.active.includes(plank)) {
                  continue;
                }
                const open = deck.companions.items.includes(plank);
                const subject = leaderCompanions.has(leaderPlank)
                  ? variant && (!open || deck.companions.variant !== variant)
                    ? `${plank}/~${variant}`
                    : undefined
                  : open
                    ? null
                    : undefined;
                if (subject !== undefined) {
                  Effect.runFork(
                    invoke(LayoutOperation.UpdateCompanion, { subject, anchor: plank }).pipe(
                      Effect.catch((err) => Effect.sync(() => log.warn('follow companion failed', { err }))),
                    ),
                  );
                }
              }
            }
          }
        };

        update();
        const unsubscribeView = registry.subscribe(viewAtom, update);
        const tick = setInterval(update, TICK_INTERVAL);

        yield* Effect.addFinalizer(() =>
          Effect.gen(function* () {
            unsubscribeView();
            clearInterval(tick);
            unmountShowing();
            if (navigating) {
              yield* Fiber.interrupt(navigating);
            }
          }),
        );
        return showing as Atom.Atom<boolean>;
      });

    return Capability.contribute(AppCapabilities.LocatorExtension, {
      id: DeckNamespace.key,
      location,
      navigates: true,
      follow,
    });
  }),
);
