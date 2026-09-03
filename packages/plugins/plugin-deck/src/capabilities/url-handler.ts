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
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NotFound from '@dxos/app-toolkit/NotFound';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import * as Operation from '@dxos/compute/Operation';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import { Attention } from '@dxos/react-ui-attention/types';
import { isTauri } from '@dxos/util';

import { CompanionViewState, DeckCapabilities, DeckSchema } from '#types';

import {
  combineVerdicts,
  getCandidateEntityIds,
  getRenderedPlanks,
  isCompanionOpen,
  resolveCompanionAnchor,
  serializeDeckToUrl,
} from '../util';
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

/** Strip the `root/` prefix off a qualified workspace path, back to the bare `UrlPath` workspace token. */
const bareWorkspace = (qualifiedWorkspace: string): string => {
  const [, workspace] = qualifiedWorkspace.split('/');
  return workspace ?? qualifiedWorkspace;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const operationService = yield* Capabilities.OperationInvoker;
    const navigationHandlers = yield* AppCapabilities.NavigationHandler;
    const navigationTargetLoaders = yield* AppCapabilities.NavigationTargetLoader;
    const registry = yield* Capabilities.AtomRegistry;
    const stateAtom = yield* DeckCapabilities.State;
    const ephemeralAtom = yield* DeckCapabilities.EphemeralState;
    const settingsAtom = yield* DeckCapabilities.Settings;
    const viewState = yield* AttentionCapabilities.ViewState;
    const attention = yield* AttentionCapabilities.Attention;
    // The graph builder is contributed once by plugin-graph and is stable for the app's lifetime,
    // so both the inbound (URL -> state) resolution and the outbound sync below share this handle.
    const builder = yield* AppCapabilities.AppGraph;
    const manager = yield* Plugin.Service;

    /**
     * Dispatch all NavigationHandler contributions with a given URL.
     *
     * `catchAllCause`, not `catchAll`: a handler that invokes an operation fails as a DEFECT
     * (`Process.fromOperation` uses `Effect.orDie`), which the Fail channel does not carry. On the
     * `?token&type=login` boot the redeem races the forked client init, so the defect is the COMMON
     * path — and left to escape it fails this module's activation, taking the popstate listener,
     * the URL<->state sync and the leave-trap down for the whole session.
     */
    const dispatchNavigationHandlers = (url: URL) =>
      Effect.all(
        navigationHandlers
          .get()
          .map((handler) =>
            handler(url).pipe(
              Effect.catchCause((cause) =>
                Effect.sync(() => log.warn('navigation handler failed', { error: Cause.pretty(cause) })),
              ),
            ),
          ),
        { concurrency: 'unbounded' },
      );

    const provideServices = <A, E>(effect: Effect.Effect<A, E, Operation.Service>) =>
      effect.pipe(Effect.provideService(Operation.Service, operationService));

    // Helper to get computed deck from state.
    const getDeck = () => {
      const state = registry.get(stateAtom);
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      return deck;
    };

    // Helper to update state.
    const updateState = (fn: (current: DeckSchema.StoredDeckState) => DeckSchema.StoredDeckState) => {
      registry.set(stateAtom, fn(registry.get(stateAtom)));
    };

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

    /** Fallback for the outbound sync while a plank's node is out of the graph and unrepresentable. */
    const lastRepresentation = new Map<string, PathResolution.RepresentedNode>();
    const seedRepresentation = (nodeId: string, node: PathResolution.RepresentedNode) => {
      lastRepresentation.set(nodeId, node);
    };

    const handleNavigation = Effect.fn(function* (url?: URL, options?: { abortIf?: () => boolean }) {
      const resolvedUrl = url ?? new URL(window.location.href);
      // When native redirect is active, check-app-scheme owns the initial dispatch
      // to prevent one-time tokens from being consumed before the native app can use them.
      const settings = registry.get(settingsAtom);
      const deferHandlers = settings?.enableNativeRedirect && shouldDeferNavigationHandlers();
      if (!deferHandlers) {
        yield* dispatchNavigationHandlers(resolvedUrl);
      }

      const pathname = resolvedUrl.pathname;
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
            manager.activate(ActivationEvents.Idle).pipe(
              Effect.catchCause((cause) =>
                Effect.sync(() =>
                  log.warn('idle activation failed during url restore', { error: Cause.pretty(cause) }),
                ),
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
      // An explicit navigation supersedes the URL restore. Checked HERE, before any write: the
      // parse above can wait out its full deadline, and the not-found branch below writes and
      // returns — so a check placed only before `Set` would let a timed-out restore knock the user
      // out of whatever they had opened in the meantime.
      if (options?.abortIf?.()) {
        return;
      }

      if (Option.isNone(parsed)) {
        // Unknown/malformed path: same outcome as an unresolvable subject id always had — open the
        // not-found sentinel. `immediate` skips validation, which is redundant for the sentinel anyway.
        yield* Operation.invoke(LayoutOperation.Open, {
          subject: [NotFound.NOT_FOUND_PATH],
          navigation: 'immediate',
        });
        return;
      }

      const { workspace, pairs } = parsed.value;
      // `/w/default` was written by builds that serialized the unresolved-workspace sentinel; map it back
      // to the sentinel rather than to `root/default`, which resolves to no node and so can never heal.
      const workspacePath =
        workspace === DeckSchema.DEFAULT_DECK_ID ? DeckSchema.DEFAULT_DECK_ID : GraphPath.getSpacePath(workspace);
      const state = registry.get(stateAtom);
      if (workspacePath !== state.activeDeck) {
        yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: workspacePath });
      }

      if (pairs.length === 0) {
        // Workspace-only URL: SwitchWorkspace above already restored the workspace's persisted deck.
        return;
      }

      // Preload the URL's plank objects so a cold restore materializes their graph nodes before
      // resolution. `resolveUrl` walks the graph, which only surfaces objects ECHO has already loaded;
      // without this the walk races async loading and falls to not-found on reload/deep-link. The
      // NavigationTargetLoader (contributed by plugin-client) keeps this plugin free of a client
      // dependency; absent (e.g. headless), resolution simply falls back to its guided search. The
      // per-pair verdict records what the loader could determine, gating the resolve retry below so
      // a genuine 404 fails fast instead of waiting out the timeout.
      const loaders = navigationTargetLoaders.get();
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
            ).pipe(Effect.tap((results) => Effect.sync(() => (verdicts[index] = combineVerdicts(results.flat())))));
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
      const unresolved: string[] = [];
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
        if (nodeId) {
          plankIds.push(nodeId);
          return;
        }
        // Keyed on the id it would have, not the sentinel, which is a different object: `useNode`
        // then renders it the moment the node lands.
        const candidateId = resolved[index]?.candidateId;
        if (!candidateId) {
          // An unknown key names nothing to address.
          plankIds.push(NotFound.NOT_FOUND_PATH);
          return;
        }
        plankIds.push(candidateId);
        unresolved.push(candidateId);
        // An absent node has no graph provenance, so only the URL itself can represent this pair.
        seedRepresentation(candidateId, { key: pair.key, id: pair.id, workspace: pair.workspace });
      });

      // Re-checked after resolution, which is a second multi-second wait: `Set` overrides the deck
      // wholesale, so applying it now would undo whatever the user opened while it ran.
      if (options?.abortIf?.()) {
        return;
      }

      // Recorded before `Set` so the planks never render as blank loaders in the frame that adds them.
      registry.set(ephemeralAtom, { ...registry.get(ephemeralAtom), unresolved });

      // `Set` already means "override the deck's active list wholesale" — exactly a URL-driven
      // restore, for one plank or many, with no separate disposition to invent.
      yield* Operation.invoke(LayoutOperation.Set, { subject: plankIds });

      // Attention is never serialized; on load it defaults to the last plank in the chain — except when
      // the chain carries a companion, whose position *is* serialized and which only renders beside the
      // plank it is anchored to, so attention has to land there for the URL to restore faithfully.
      const attendId = companionAnchorId ?? plankIds[plankIds.length - 1];
      if (attendId) {
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: attendId });
      }

      // The companion is part of the URL-derived deck state too: explicitly close it when the chain
      // carries no companion pair, rather than leaving a stale companion open from before navigation.
      yield* Operation.invoke(LayoutOperation.UpdateCompanion, { subject: companionNodeId });
    });

    const onPopState = () => void EffectEx.runAndForwardErrors(provideServices(handleNavigation()));

    // Install before handleNavigation()/state-sync push entries on top of the sentinel.
    const sentinelKey = installLeaveTrap();

    // Landing on the sentinel means a Back is about to leave Composer; confirm and act on it.
    // The guard stops our own back()/forward() from re-entering.
    let handlingSentinel = false;
    const onCurrentEntryChange = () => {
      const current = window.navigation.currentEntry;
      if (handlingSentinel || !current || current.key !== sentinelKey) {
        return;
      }
      handlingSentinel = true;
      queueMicrotask(() => {
        if (window.confirm('Leave Composer?')) {
          history.back(); // Past the sentinel to the prior page.
        } else {
          history.forward(); // Back to where the user was.
        }
        setTimeout(() => {
          handlingSentinel = false;
        });
      });
    };

    window.addEventListener('popstate', onPopState);
    if ('navigation' in window) {
      window.navigation.addEventListener('currententrychange', onCurrentEntryChange);
    }

    // Tauri deep link support.
    let unlistenDeepLink: (() => void) | undefined;
    if (isTauri()) {
      yield* Effect.gen(function* () {
        const { getCurrent, onOpenUrl } = yield* Effect.promise(() => import('@tauri-apps/plugin-deep-link'));

        const launchUrls = yield* Effect.promise(() => getCurrent());
        if (launchUrls && launchUrls.length > 0) {
          log('app launched with deep links', { urls: launchUrls });
          for (const urlString of launchUrls) {
            yield* provideServices(handleDeepLink(urlString, handleNavigation));
          }
        }

        unlistenDeepLink = yield* Effect.promise(() =>
          onOpenUrl((urls) => {
            for (const urlString of urls) {
              void EffectEx.runAndForwardErrors(provideServices(handleDeepLink(urlString, handleNavigation)));
            }
          }),
        );
      }).pipe(
        Effect.catch((error) => Effect.sync(() => log.warn('failed to initialize deep link listener', { error }))),
      );
    }

    // Sync URL with layout state changes: deck state (active planks, companion open/closed) and the
    // companion's selected variant. Attention is deliberately absent — it is never serialized.
    // `method: 'replace'` is used for the first write, to correct a stale/bare URL against the
    // already-persisted deck without adding a spurious back-history entry; every later firing (a real
    // state change) pushes. `replace` is deferred rather than fixed to the post-setup call because a
    // fresh profile starts on the sentinel below, whose first real workspace arrives later.
    let synced = false;
    const syncUrl = (method: 'push' | 'replace' = 'push') => {
      const state = registry.get(stateAtom);
      if (state.activeDeck === DeckSchema.DEFAULT_DECK_ID) {
        // The sentinel is not a workspace: serializing it produces `/w/default`, which on the next load
        // parses as a workspace that resolves to no node, leaving the app with an unavailable workspace.
        // Leave the URL alone until a real workspace becomes active.
        return;
      }

      const effectiveMethod = synced ? method : 'replace';
      synced = true;
      const deck = getDeck();
      const workspace = bareWorkspace(state.activeDeck);

      const representations = new Map<string, PathResolution.RepresentedNode>();
      let lossy = false;
      for (const id of deck.active) {
        const represented = PathResolution.representNode(builder, id).pipe(
          // Provenance is deleted the moment a node leaves the graph, so a plank whose subtree is
          // momentarily absent (a connector re-emitting, a query settling) is unrepresentable.
          Option.orElse(() => Option.fromUndefinedOr(lastRepresentation.get(id))),
        );
        if (Option.isSome(represented)) {
          representations.set(id, represented.value);
          lastRepresentation.set(id, represented.value);
        } else {
          lossy = true;
          log.warn('plank has no URL representation', { id });
        }
      }

      // A shortened URL is indistinguishable from one the user chose, so the next restore reads it as
      // truth and the plank is lost. A stale URL heals on the next successful sync; a truncated one cannot.
      if (lossy) {
        return;
      }

      // The companion shares a container with the attended plank, and is serialized as
      // `companion/<variant>` after that plank's own pair. Attention itself is still never serialized —
      // it is read here only to place the companion, and a bare attention change does not resync the URL.
      let companion: { plankId: string; node: PathResolution.RepresentedNode } | undefined;
      if (deck.companionPlanks.length > 0 && deck.active.length > 0) {
        // Resolved against the rendered planks, not `deck.active`: under `flatten` only the current plank
        // is laid out, so anchoring to an earlier one would serialize a companion the deck cannot render.
        const rendered = getRenderedPlanks(deck.active, registry.get(settingsAtom)?.flatten);
        const anchorId = resolveCompanionAnchor(rendered, attention.getCurrent());
        // Only the attended plank's companion is on screen, so only it belongs in the URL. Under
        // `flatten` the open flag is deck-wide, so it applies to whichever plank is rendered.
        const plankId =
          anchorId && isCompanionOpen(deck.companionPlanks, registry.get(settingsAtom)?.flatten, anchorId)
            ? anchorId
            : undefined;
        const selection = viewState.get(CompanionViewState.aspect, CompanionViewState.CONTEXT);
        if (plankId && selection.variant) {
          const companionNodeId = `${plankId}/${Attention.linkedSegment(selection.variant)}`;
          const represented = PathResolution.representNode(builder, companionNodeId);
          if (Option.isSome(represented)) {
            companion = { plankId, node: represented.value };
          }
        }
      }

      const workspaceKey = UrlPath.WORKSPACE_KEY;
      const path = serializeDeckToUrl({ workspace, workspaceKey, active: deck.active, representations, companion });
      const newUrl = `${path}${window.location.search}`;

      // Update only when the derived URL actually differs from the current one — the deck state and
      // companion-variant atoms both funnel into this same recompute, so most firings are no-ops.
      if (`${window.location.pathname}${window.location.search}` !== newUrl) {
        if (effectiveMethod === 'replace') {
          history.replaceState(null, '', newUrl);
        } else {
          history.pushState(null, '', newUrl);
        }
      }
    };

    // Subscribed HERE, not from the restore fiber: the restore can now wait seconds for URL keys and
    // for its nodes, and a navigation during that window would otherwise have no subscriber at all —
    // the first navigation after a reload silently failed to update the URL. The writes are gated
    // instead, so nothing overwrites the URL being restored from with the pre-restore deck.
    // Subscribed at activation and NOT gated on the restore: these fire only on an actual write, and
    // a write means someone — the user or the restore itself — changed the deck, so the URL should
    // follow it. Gating them instead swallowed every navigation made while the restore was still
    // waiting on its nodes, which is up to the full deadline.
    let userNavigated = false;
    const unsubscribeState = registry.subscribe(stateAtom, () => {
      userNavigated = true;
      syncUrl();
    });
    const unsubscribeCompanionVariant = viewState.subscribe(CompanionViewState.aspect, CompanionViewState.CONTEXT, () =>
      syncUrl(),
    );
    // Only the unconditional BASELINE write is deferred: it serializes the current deck whether or
    // not anything changed, so at activation it would replace the URL being restored from with the
    // empty pre-restore deck.
    const startUrlSync = () => {
      // Correct a bare/stale URL against the already-persisted deck on load (see the note above).
      syncUrl('replace');
    };

    // Forked because this module sits on the startup pass: the restore can now wait for
    // late-arriving URL keys (see `awaitUrlKeys`), and awaiting that here would hold the whole
    // pass — and the boot loader with it — until the client is up.
    yield* Effect.forkScoped(
      provideServices(handleNavigation(undefined, { abortIf: () => userNavigated })).pipe(
        Effect.andThen(Effect.sync(startUrlSync)),
      ),
    );

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        window.removeEventListener('popstate', onPopState);
        if ('navigation' in window) {
          window.navigation.removeEventListener('currententrychange', onCurrentEntryChange);
        }
        unsubscribeState();
        unsubscribeCompanionVariant();
        unlistenDeepLink?.();
      }),
    );
    return [];
  }),
);

/**
 * sessionStorage key holding the sentinel history entry's key. The entry is identified by its
 * (reload-stable) Navigation API key rather than by entry state, because the deck overwrites
 * history state via replaceState during URL sync — which would erase a state marker. sessionStorage
 * survives reloads within the tab and the deck never touches it.
 */
const SENTINEL_STORAGE_KEY = 'dxos.composer.deck.leaveTrap.sentinelKey';

/**
 * Insert a "sentinel" history entry beneath the app's working entries, so a Back-press that would
 * leave Composer instead lands on the sentinel — where `onCurrentEntryChange` confirms the exit. A
 * cross-document back is uncancelable and `beforeunload` cannot distinguish reload from leave, so
 * this same-document floor is required; reload fires no traversal and is never trapped. Requires the
 * Navigation API (Chromium); no-op otherwise. Idempotent across reloads via the sessionStorage-held
 * entry key, so the sentinel is not duplicated. Returns the sentinel entry's key, or undefined.
 */
const installLeaveTrap = (): string | undefined => {
  if (!('navigation' in window)) {
    return undefined;
  }
  const saved = sessionStorage.getItem(SENTINEL_STORAGE_KEY);
  if (saved && window.navigation.entries().some((entry) => entry.key === saved)) {
    // The sentinel survived (reload, or the user returned to Composer after leaving). If we are
    // sitting ON it — e.g. the user left via the sentinel then came back Forward onto it — push a
    // working entry above so the user is above the floor again and the trap re-arms.
    if (window.navigation.currentEntry?.key === saved) {
      history.pushState(null, '', window.location.pathname + window.location.search);
    }
    return saved;
  }
  // history.length > 1 (not navigation.canGoBack, which is false for a cross-origin prior entry)
  // means there is somewhere to leave to; otherwise Back can't exit and no sentinel is needed.
  const key = window.navigation.currentEntry?.key;
  if (key && window.history.length > 1) {
    // Record the current (landing) entry as the sentinel, then push the working entry above it.
    sessionStorage.setItem(SENTINEL_STORAGE_KEY, key);
    history.pushState(null, '', window.location.pathname + window.location.search);
    return key;
  }
  return undefined;
};

/** Check if a path is a redirect path handled elsewhere (e.g., OAuth). */
const isRedirectPath = (pathname: string): boolean => pathname.startsWith('/redirect/');

/** Handle a deep link URL string. Merges query params into window.location and navigates. */
const handleDeepLink = Effect.fn(function* (urlString: string, navigate: (url?: URL) => Effect.Effect<void, any, any>) {
  log('deep link received', { url: urlString });

  const deepLinkUrl = new URL(urlString);

  // For custom schemes (e.g., composer://a/b/c), new URL() treats the first segment as the
  // hostname. Reconstruct the full path from hostname + pathname.
  const fullPath =
    deepLinkUrl.protocol !== 'https:' && deepLinkUrl.protocol !== 'http:' && deepLinkUrl.hostname
      ? '/' + deepLinkUrl.hostname + deepLinkUrl.pathname
      : deepLinkUrl.pathname;

  if (isRedirectPath(fullPath)) {
    return;
  }

  // Merge deep link query params into the current window URL so handlers can read them.
  const current = new URL(window.location.href);
  if (deepLinkUrl.search) {
    deepLinkUrl.searchParams.forEach((value, key) => current.searchParams.set(key, value));
  }
  current.pathname = fullPath;
  history.replaceState(null, '', current.pathname + current.search);

  yield* navigate(current);
});
