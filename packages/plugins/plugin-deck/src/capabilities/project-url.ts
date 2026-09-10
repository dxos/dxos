//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
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

import { applyActive, applyCompanion, applyWorkspace } from '../operations/apply';
import { getCandidateEntityIds, getUnresolvedPlankId } from '../util';
import * as Navigation from '../util/navigation';
import { shouldDeferNavigationHandlers } from './check-app-scheme';

/**
 * Deadline for a cold restore's container chain to materialize. Not a poll interval: resolution
 * waits on the candidate node and returns as soon as it lands, so this only bounds the wait for a
 * node that never arrives. Generous because it costs nothing when the chain lands early.
 */
// TODO(wittjosiah): Shorten, or apply the restore per-pair. `Set` applies once after every pair
//  settles, so the slowest pair holds back the ones that already resolved.
const RESOLVE_TIMEOUT = '10 seconds';

/** Cap on a single navigation-target loader, whose own waits (client init, space readiness) are unbounded. */
const LOADER_TIMEOUT = '5 seconds';

/**
 * The projection that is allowed to write. A projection can wait out both deadlines above, so one
 * that started earlier may still be running when a newer URL arrives; it stamps itself on entry and
 * stops at the next write once a newer one has stamped over it. Latest wins, always.
 */
let generation = 0;

/**
 * A URL that arrived from outside the app: boot, a history traversal, or a deep link.
 *
 * Handlers redeem tokens and join invitations, so they must see a URL the user actually arrived at
 * and no other. An operation-driven navigation formats its own URL and goes straight to
 * {@link projectUrl}, which is why the two are separate entry points.
 */
export const handleExternalUrl = Effect.fnUntraced(function* (url?: URL) {
  const navigationHandlers = yield* Capability.getAll(AppCapabilities.NavigationHandler);
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const settingsAtom = yield* Capability.get(DeckCapabilities.Settings);

  const resolvedUrl = url ?? new URL(window.location.href);
  // When native redirect is active, check-app-scheme owns the initial dispatch
  // to prevent one-time tokens from being consumed before the native app can use them.
  const settings = registry.get(settingsAtom);
  if (!(settings?.enableNativeRedirect && shouldDeferNavigationHandlers())) {
    // `catchAllCause`, not `catchAll`: a handler that invokes an operation fails as a DEFECT
    // (`Process.fromOperation` uses `Effect.orDie`), which the Fail channel does not carry. On the
    // `?token&type=login` boot the redeem races the forked client init, so the defect is the COMMON
    // path — and left to escape it fails this module's activation, taking the popstate listener,
    // the URL projection and the leave-trap down for the whole session.
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
 * Project a URL into deck state. The deck's only writer.
 *
 * Every way the URL can change reaches this: a history traversal, a deep link, boot, and an
 * operation that has just pushed. There is deliberately no path back, so nothing here has to tell
 * a URL-driven write apart from any other kind.
 *
 * Returns the plank attention should move to, or `undefined` when it should stay where it is.
 * `attend` says which rule applies: an external URL carries no attention of its own, so it lands on
 * the plank the chain ends with, while an operation knows which plank it acted on.
 */
export const projectUrl = Effect.fnUntraced(function* (url?: URL, options?: { attend?: boolean }) {
  const attendChainEnd = options?.attend ?? true;
  const navigationTargetLoaders = yield* Capability.getAll(AppCapabilities.NavigationTargetLoader);
  const registry = yield* Capability.get(Capabilities.AtomRegistry);
  const stateAtom = yield* Capability.get(DeckCapabilities.State);
  const ephemeralAtom = yield* Capability.get(DeckCapabilities.EphemeralState);
  // Contributed once by plugin-graph and stable for the app's lifetime.
  const builder = yield* Capability.get(AppCapabilities.AppGraph);
  // Optional: the Idle wave only matters for a URL arriving from outside, where the keys may not be
  // registered yet. An operation-driven navigation formatted its own URL, so its keys already exist.
  const manager = yield* Effect.serviceOption(Plugin.Service);

  const stamp = ++generation;
  /** Whether this projection is still the current one; see {@link generation}. */
  const current = () => stamp === generation;

  // Helper to update state.
  const updateState = (fn: (current: DeckSchema.StoredDeckState) => DeckSchema.StoredDeckState) => {
    registry.set(stateAtom, fn(registry.get(stateAtom)));
  };

  /** The plank id the deck currently holds for each URL segment it has open. */
  const knownIdsBySegment = Effect.fnUntraced(function* () {
    const state = registry.get(stateAtom);
    const { segments } = registry.get(ephemeralAtom);
    const active = state.decks[state.activeDeck]?.active ?? [];
    return new Map(active.map((id) => [segments?.[id] ?? id, id]));
  });

  /**
   * Re-runs `parse` as builders register their keys, settling as soon as it succeeds — the deadline
   * only bounds a URL whose keys never arrive.
   *
   * Keyed off the builder's OWN extensions, which is what `buildUrlKeyTable` reads. The
   * `AppGraphBuilder` capability is a step removed: plugin-graph registers extensions from its own
   * subscription to that capability, and two subscribers have no relative ordering — waking on the
   * capability can therefore re-parse against extensions not yet added, miss, and then wait out the
   * full deadline for a further contribution that never comes.
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
    // Bare root with no `/w/...` info at all (a fresh visit, no bookmarked deep link): leave the
    // persisted deck exactly as it is. The outbound sync below rewrites the URL to reflect it as
    // soon as the deck state is next read, so this is not a dead end.
    return;
  }

  yield* UrlPath.readWorkspace(pathname).pipe(
    Option.filter(Key.SpaceId.isValid),
    Option.match({
      onNone: () => Effect.void,
      onSome: (workspace) => switchWorkspace(GraphPath.getSpacePath(workspace)),
    }),
  );

  // Unified so the branches share one Effect type; the wave is only pullable with a manager.
  const pullIdle: Effect.Effect<void, Error> = Option.isSome(manager)
    ? Effect.asVoid(manager.value.activate(ActivationEvents.Idle))
    : Effect.void;

  const parseUrl = () => UrlPath.parse(pathname, PathResolution.buildUrlKeyTable(builder));
  const parsed = yield* parseUrl().pipe(
    Option.match({
      onSome: Effect.succeedSome,
      // URL keys come from graph builders that ride Idle, and a deep link can be restored
      // before that wave lands. The URL is itself the demand signal, so pull the wave and
      // re-parse — awaited, so this settles when the contributions are in, not on a timer.
      //
      // Failures are logged, not propagated, matching the scheduler's own idle daemon: the wave
      // carries every plugin's registration contributions, so one broken plugin must not take
      // URL handling down with it. Re-parsing then simply misses and falls through to the
      // not-found sentinel below.
      onNone: () =>
        pullIdle.pipe(
          Effect.catchCause((cause) =>
            Effect.sync(() => log.warn('idle activation failed during url restore', { error: Cause.pretty(cause) })),
          ),
          Effect.map(parseUrl),
          // Not every builder rides Idle: the one registering the space/workspace keys is gated
          // on the client being initialized, which the forked initialization lands well after a
          // reload's restore. Declaring not-found here would do so on a URL whose keys simply
          // are not registered YET — and immediately, never reaching the per-pair node wait
          // below. Re-parse as contributions arrive instead, bounded by the same deadline.
          Effect.flatMap((afterIdle) =>
            Option.isSome(afterIdle) ? Effect.succeed(afterIdle) : parseWhenKeysArrive(parseUrl),
          ),
        ),
    }),
  );
  if (!current()) {
    return undefined;
  }
  if (Option.isNone(parsed)) {
    // A path that does not parse names no pair, so there is nothing to key a plank on.
    yield* applyActive([NotFound.NOT_FOUND_PATH], {});
    return undefined;
  }

  const { workspace, pairs } = parsed.value;
  // `/w/default` was written by builds that serialized the unresolved-workspace sentinel; map it back
  // to the sentinel rather than to `root/default`, which resolves to no node and so can never heal.
  const workspacePath =
    workspace === DeckSchema.DEFAULT_DECK_ID ? DeckSchema.DEFAULT_DECK_ID : GraphPath.getSpacePath(workspace);
  yield* switchWorkspace(workspacePath);

  if (pairs.length === 0) {
    // Workspace-only URL: SwitchWorkspace above already restored the workspace's persisted deck.
    return undefined;
  }

  // The planks the URL names, before anything is resolved. The pair is a plank's identity, so the
  // deck can render them now and let each one find its own node: a plank with no node renders a
  // loading shell (see `DeckPlank`). Waiting for resolution first would leave the deck empty for as
  // long as the slowest pair takes.
  //
  // A plank the deck already holds keeps the id it already has. Only a segment the deck has never
  // seen gets a placeholder, so the common case — a navigation that leaves the other planks alone —
  // does not re-key them and unmount their content on the way to the same ids.
  if (!current()) {
    return undefined;
  }

  const known = yield* knownIdsBySegment();
  const initial = pairs
    .filter((pair) => pair.key !== UrlPath.COMPANION_KEY)
    .map((pair) => {
      const segment = Navigation.toSegment(pair);
      return { segment, id: known.get(segment) ?? getUnresolvedPlankId(pair) };
    });
  yield* applyActive(
    initial.map(({ id }) => id),
    Object.fromEntries(initial.map(({ id, segment }) => [id, segment])),
  );

  // Preload the URL's plank objects so a cold restore materializes their graph nodes before
  // resolution. `resolveUrl` walks the graph, which only surfaces objects ECHO has already loaded;
  // without this the walk races async loading and falls to not-found on reload/deep-link. The
  // NavigationTargetLoader (contributed by plugin-client) keeps this plugin free of a client
  // dependency; absent (e.g. headless), resolution simply falls back to its guided search. The
  // per-pair verdict records what the loader could determine, gating the resolve retry below so
  // a genuine 404 fails fast instead of waiting out the timeout.
  const loaders = navigationTargetLoaders;
  // Waiting is the default; fail-fast has to be earned. Keyless pairs (singleton keys like the
  // space home) have no object to confirm against and stay `unknown`.
  const verdicts: AppCapabilities.NavigationTargetVerdict[] = pairs.map(() => 'unknown');
  if (loaders.length > 0) {
    yield* Effect.forEach(
      pairs,
      (pair, index) => {
        // Which tail segment holds the object id is extension-specific, so ask about all of them
        // (see `getCandidateEntityIds`). A pair naming no object at all stays `unknown`.
        const candidates =
          pair.id === undefined ? [] : getCandidateEntityIds(pair.id, builder.urlGrammar.tailSeparator);
        if (candidates.length === 0) {
          return Effect.void;
        }
        return Effect.forEach(candidates, (entityId) =>
          Effect.forEach(loaders, (loader) =>
            loader.load({ spaceId: pair.workspace, entityId }).pipe(
              // A loader may await client initialization or space readiness, neither of which is
              // bounded; unbounded here would strand the restore before it ever reaches its own
              // deadline. Expiring is `unknown`, so the pair keeps its wait.
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

  // Loading an object does not load its container chain (e.g. the collection it lives in), which
  // resolution expands but cannot synchronously observe. On a cold restore every pair misses the
  // immediate read, so the wait is the normal path and only proof of absence may skip it.
  const resolved = yield* PathResolution.resolveUrl(
    builder,
    { workspace, pairs },
    { wait: (index) => (verdicts[index] === 'absent' ? undefined : RESOLVE_TIMEOUT) },
  );

  // Planks resolve in chain order; a `companion/<variant>` pair belongs to the plank before it rather
  // than being a plank of its own, so it drives that plank's companion state and the selected variant.
  const plankIds: string[] = [];
  const segments: Record<string, string> = {};
  let companionNodeId: string | null = null;
  let companionAnchorId: string | undefined;
  pairs.forEach((pair, index) => {
    const nodeId = resolved[index]?.nodeId;
    if (pair.key === UrlPath.COMPANION_KEY) {
      if (nodeId) {
        companionNodeId = nodeId;
        companionAnchorId = plankIds[plankIds.length - 1];
      }
      return;
    }
    const plankId = nodeId ?? resolved[index]?.candidateId ?? getUnresolvedPlankId(pair);
    plankIds.push(plankId);
    segments[plankId] = Navigation.toSegment(pair);
  });

  if (!current()) {
    return undefined;
  }

  // The projection writes the deck directly rather than invoking `Set`: once `Set` navigates, an
  // operation that navigates and a projection that applies a navigation would call each other.
  const displaced = yield* applyActive(plankIds, segments);

  // The companion is part of the URL-derived deck state too: explicitly close it when the chain
  // carries no companion pair, rather than leaving a stale companion open from before navigation.
  yield* applyCompanion(companionNodeId);

  if (!attendChainEnd) {
    // The operation that pushed this URL knows which plank it acted on; `displaced` only names one
    // when the plank holding attention is no longer open.
    return displaced;
  }

  // Attention is never serialized; on an external URL it lands on the last plank in the chain —
  // except when the chain carries a companion, whose position *is* serialized and which only renders
  // beside the plank it is anchored to, so attention has to land there for the URL to restore faithfully.
  return companionAnchorId ?? plankIds[plankIds.length - 1];
});
