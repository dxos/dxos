//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as FiberHandle from 'effect/FiberHandle';
import * as Option from 'effect/Option';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as PathResolution from '@dxos/app-graph/PathResolution';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as NotFound from '@dxos/app-toolkit/NotFound';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import { Key } from '@dxos/echo';
import { log } from '@dxos/log';

import { DeckCapabilities, DeckSchema } from '#types';

import { shouldDeferNavigationHandlers } from '../capabilities/check-app-scheme.ts';
import { applyActive, applyCompanion, applyWorkspace } from './apply.ts';
import * as Navigation from './navigation.ts';
import { getCandidateEntityIds, getUnresolvedPlankId } from './navigation.ts';

/**
 * How long resolution waits for a pair's node before it stops trying. Exported because a plank waits
 * exactly this long too: past it nothing is still coming, so the plank says not found.
 */
export const RESOLVE_TIMEOUT_MS = 10_000;

// TODO(wittjosiah): Shorten, or apply the restore per-pair.
const RESOLVE_TIMEOUT = `${RESOLVE_TIMEOUT_MS} millis`;

const LOADER_TIMEOUT = '5 seconds';

/** Dispatch navigation handlers for a URL arriving from outside the app, then project it. */
export const handleExternalUrl = Effect.fnUntraced(function* (url?: URL) {
  const navigationHandlers = yield* Capability.getAll(AppCapabilities.NavigationHandler);
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const settingsAtom = yield* Capability.get(DeckCapabilities.Settings);

  const resolvedUrl = url ?? new URL(window.location.href);
  const settings = registry.get(settingsAtom);
  if (!(settings?.enableNativeRedirect && shouldDeferNavigationHandlers())) {
    yield* Effect.all(
      navigationHandlers.map((handler) =>
        handler(resolvedUrl).pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => log.warn('navigation handler failed', { error: Cause.pretty(cause) })),
          ),
        ),
      ),
      { concurrency: 'unbounded' },
    );
  }

  return yield* projectUrl(resolvedUrl);
});

/**
 * Project a URL into deck state, returning the plank attention should move to, or `undefined` when
 * it should stay where it is. `attend` attends the end of the chain rather than the displaced plank.
 */
const project = Effect.fnUntraced(function* (url?: URL, options?: { attend?: boolean }) {
  const attendChainEnd = options?.attend ?? true;
  const navigationTargetLoaders = yield* Capability.getAll(AppCapabilities.NavigationTargetLoader);
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const stateAtom = yield* Capability.get(DeckCapabilities.State);
  const ephemeralAtom = yield* Capability.get(DeckCapabilities.EphemeralState);
  const builder = yield* Capability.get(AppCapabilities.AppGraph);
  const manager = yield* Effect.serviceOption(Plugin.Service);

  const updateState = (fn: (current: DeckSchema.StoredDeckState) => DeckSchema.StoredDeckState) => {
    registry.set(stateAtom, fn(registry.get(stateAtom)));
  };

  const knownIdsBySegment = Effect.fnUntraced(function* () {
    const state = registry.get(stateAtom);
    const workspace = registry.get(ephemeralAtom).open[state.activeDeck];
    const active = workspace?.active ?? [];
    return new Map(active.map((id: string) => [Navigation.segmentOf(workspace?.segments, id), id]));
  });

  /**
   * Re-runs `parse` as builders register their keys, settling as soon as it succeeds. Keyed off the
   * builder's own extensions, not the `AppGraphBuilder` capability: two subscribers to that
   * capability have no relative ordering, so waking on it can re-parse against extensions the
   * builder has not taken yet.
   */
  const parseWhenKeysArrive = <A>(parse: () => Option.Option<A>) =>
    Effect.callback<Option.Option<A>>((resume) => {
      const cancel = registry.subscribe(builder.extensions, () => {
        const parsed = parse();
        if (Option.isSome(parsed)) {
          resume(Effect.succeed(parsed));
        }
      });
      return Effect.sync(cancel);
    }).pipe(
      Effect.timeoutOrElse({
        duration: RESOLVE_TIMEOUT,
        orElse: () => Effect.succeed(Option.none<A>()),
      }),
    );

  const switchWorkspace = (workspacePath: string) =>
    workspacePath === registry.get(stateAtom).activeDeck ? Effect.void : applyWorkspace(workspacePath);

  const pathname = (url ?? new URL(window.location.href)).pathname;
  if (pathname === '/reset') {
    updateState((s) => ({
      ...s,
      activeDeck: DeckSchema.DEFAULT_DECK_ID,
      decks: {
        [DeckSchema.DEFAULT_DECK_ID]: { ...DeckSchema.defaultDeck },
      },
    }));
    window.location.pathname = '/';
    return;
  }

  if (pathname === '/') {
    return;
  }

  yield* UrlPath.readWorkspace(pathname).pipe(
    Option.filter(Key.SpaceId.isValid),
    Option.match({
      onNone: () => Effect.void,
      onSome: (workspace) => switchWorkspace(GraphPath.getSpacePath(workspace)),
    }),
  );

  const pullIdle = Option.isSome(manager) ? Effect.asVoid(manager.value.activate(ActivationEvents.Idle)) : Effect.void;

  const parseUrl = () => UrlPath.parse(pathname, PathResolution.buildUrlKeyTable(builder));
  const parsed = yield* parseUrl().pipe(
    Option.match({
      onSome: Effect.succeedSome,
      onNone: () =>
        pullIdle.pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => log.warn('idle activation failed during url restore', { error: Cause.pretty(cause) })),
          ),
          Effect.map(parseUrl),
          Effect.flatMap((afterIdle) =>
            Option.isSome(afterIdle) ? Effect.succeed(afterIdle) : parseWhenKeysArrive(parseUrl),
          ),
        ),
    }),
  );
  if (Option.isNone(parsed)) {
    yield* applyActive([{ id: NotFound.NOT_FOUND_PATH }]);
    return undefined;
  }

  const { workspace, pairs } = parsed.value;
  const workspacePath =
    workspace === DeckSchema.DEFAULT_DECK_ID ? DeckSchema.DEFAULT_DECK_ID : GraphPath.getSpacePath(workspace);
  yield* switchWorkspace(workspacePath);

  const known = yield* knownIdsBySegment();
  const initial = pairs
    .filter((pair) => pair.key !== UrlPath.COMPANION_KEY)
    .map((pair) => {
      const segment = Navigation.toSegment(pair);
      return { segment, id: known.get(segment) ?? getUnresolvedPlankId(pair) };
    });
  yield* applyActive(initial);

  const loaders = navigationTargetLoaders;
  const verdicts: AppCapabilities.NavigationTargetVerdict[] = pairs.map(() => 'unknown');
  if (loaders.length > 0) {
    yield* Effect.forEach(
      pairs,
      (pair, index) => {
        const candidates =
          pair.id === undefined ? [] : getCandidateEntityIds(pair.id, builder.urlGrammar.tailSeparator);
        if (candidates.length === 0) {
          return Effect.void;
        }
        return Effect.forEach(candidates, (entityId) =>
          Effect.forEach(loaders, (loader) =>
            loader.load({ spaceId: pair.workspace, entityId }).pipe(
              Effect.timeoutOrElse({
                duration: LOADER_TIMEOUT,
                orElse: () => Effect.succeed<AppCapabilities.NavigationTargetVerdict>('unknown'),
              }),
              Effect.catch(() => Effect.succeed<AppCapabilities.NavigationTargetVerdict>('unknown')),
            ),
          ),
        ).pipe(
          Effect.tap((results) => Effect.sync(() => (verdicts[index] = NotFound.combineVerdicts(results.flat())))),
        );
      },
      { concurrency: 'unbounded' },
    );
  }

  const resolved = yield* PathResolution.resolveUrl(
    builder,
    { workspace, pairs },
    { wait: (index) => (verdicts[index] === 'absent' ? undefined : RESOLVE_TIMEOUT) },
  );

  const planks: Navigation.Plank[] = [];
  let companionNodeId: string | null = null;
  let companionAnchorId: string | undefined;
  pairs.forEach((pair, index) => {
    const nodeId = resolved[index]?.nodeId;
    if (pair.key === UrlPath.COMPANION_KEY) {
      if (nodeId) {
        companionNodeId = nodeId;
        companionAnchorId = planks[planks.length - 1]?.id;
      }
      return;
    }
    planks.push({
      id: nodeId ?? resolved[index]?.candidateId ?? getUnresolvedPlankId(pair),
      segment: Navigation.toSegment(pair),
    });
  });

  const displaced = yield* applyActive(planks);

  yield* applyCompanion(companionNodeId);

  if (!attendChainEnd) {
    return displaced;
  }

  return companionAnchorId ?? planks[planks.length - 1]?.id;
});

/**
 * Project a URL, as the only projection in flight.
 *
 * Starting one interrupts whatever was running, because a projection can wait out its deadlines and
 * would otherwise resume to apply a URL the address bar has long since moved off. The interrupted
 * one is the caller that has been overtaken, and it returns no plank to attend rather than failing:
 * its navigation is moot, not broken.
 */
export const projectUrl = Effect.fnUntraced(function* (url?: URL, options?: { attend?: boolean }) {
  const handle = yield* Capability.get(DeckCapabilities.Projection);
  const fiber = yield* FiberHandle.run(handle, project(url, options));
  const outcome = yield* Effect.exit(Fiber.join(fiber));
  return Exit.hasInterrupts(outcome) ? undefined : yield* outcome;
});
