//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as PubSub from 'effect/PubSub';
import * as Queue from 'effect/Queue';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { PathResolution } from '@dxos/app-graph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NotFound from '@dxos/app-toolkit/NotFound';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import * as Operation from '@dxos/compute/Operation';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { Attention } from '@dxos/react-ui-attention';
import { isTauri } from '@dxos/util';

import { DeckCapabilities, DEFAULT_DECK_ID, type StoredDeckState, defaultDeck } from '#types';

import { COMPANION_VIEW_STATE_CONTEXT, companionAspect, serializeDeckToUrl } from '../util';
import { shouldDeferNavigationHandlers } from './check-app-scheme';

/**
 * Bounded retry for URL resolution while a cold restore's container chain finishes loading.
 * The window must outlast spaces loading on a large profile — ready (module quiescence) lands
 * well before the workspace's graph subtree materializes, and an undersized window turns that
 * gap into a spurious not-found.
 */
const RESOLVE_RETRY_ATTEMPTS = 40;
const RESOLVE_RETRY_INTERVAL = '150 millis';

/** Strip the `root/` prefix off a qualified workspace path, back to the bare `UrlPath` workspace token. */
const bareWorkspace = (qualifiedWorkspace: string): string => {
  const [, workspace] = qualifiedWorkspace.split('/');
  return workspace ?? qualifiedWorkspace;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const manager = yield* Plugin.Service;
    const operationService = yield* Capabilities.OperationInvoker;
    const navigationHandlers = yield* AppCapabilities.NavigationHandler;
    const navigationTargetLoaders = yield* AppCapabilities.NavigationTargetLoader;
    const registry = yield* Capabilities.AtomRegistry;
    const stateAtom = yield* DeckCapabilities.State;
    const settingsAtom = yield* DeckCapabilities.Settings;
    const viewState = yield* AttentionCapabilities.ViewState;
    // The graph builder is contributed once by plugin-graph and is stable for the app's lifetime,
    // so both the inbound (URL -> state) resolution and the outbound sync below share this handle.
    const builder = yield* AppCapabilities.AppGraph;

    /** Dispatch all NavigationHandler contributions with a given URL. */
    const dispatchNavigationHandlers = (url: URL) =>
      Effect.all(
        navigationHandlers.get().map((handler) => handler(url)),
        { concurrency: 'unbounded' },
      );

    const provideServices = <A, E>(effect: Effect.Effect<A, E, Operation.Service>) =>
      effect.pipe(Effect.provideService(Operation.Service, operationService));

    // Helper to get state.
    const getState = () => registry.get(stateAtom);

    // Helper to get computed deck from state.
    const getDeck = () => {
      const state = getState();
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      return deck;
    };

    // Helper to update state.
    const updateState = (fn: (current: StoredDeckState) => StoredDeckState) => {
      registry.set(stateAtom, fn(getState()));
    };

    const handleNavigation = Effect.fn(function* (url?: URL) {
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
          activeDeck: DEFAULT_DECK_ID,
          decks: {
            [DEFAULT_DECK_ID]: { ...defaultDeck },
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

      let parsed = UrlPath.parse(pathname, PathResolution.buildUrlKeyTable(builder));
      if (Option.isNone(parsed)) {
        // An unknown key may belong to a start-gated plugin whose graph builder has not
        // registered its URL keys yet — the URL itself is the demand signal. The key's owner is
        // unknowable before parsing, so fire every plugin's start event, then re-parse
        // (bounded: contributions land reactively as the waves resolve).
        yield* ActivationEvents.activateAllPluginStartEvents(manager);
        for (let attempt = 0; attempt < RESOLVE_RETRY_ATTEMPTS && Option.isNone(parsed); attempt++) {
          yield* Effect.sleep(RESOLVE_RETRY_INTERVAL);
          parsed = UrlPath.parse(pathname, PathResolution.buildUrlKeyTable(builder));
        }
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
      const workspacePath = workspace === DEFAULT_DECK_ID ? DEFAULT_DECK_ID : GraphPath.getSpacePath(workspace);
      const state = getState();
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
      // per-pair boolean records which planks the loader confirmed exist, gating the resolve retry
      // below so a genuine 404 fails fast instead of waiting out the timeout.
      const loaders = navigationTargetLoaders.get();
      // Keyless pairs (singleton keys like the space home) carry no object id for a loader to
      // confirm or disconfirm; their nodes materialize with the workspace's graph subtree, which
      // races spaces loading on reload — so they always ride the retry window below. Fail-fast
      // stays reserved for object pairs a loader positively disconfirmed.
      const confirmed = pairs.map((pair) => pair.id === undefined);
      if (loaders.length > 0) {
        yield* Effect.forEach(
          pairs,
          (pair, index) => {
            if (pair.id === undefined) {
              return Effect.void;
            }
            // A static-path pair id is `<...pathSegments>+<objectId>`; the loader wants the bare object
            // id (the final tail segment), else `EntityId.isValid` rejects the compound form.
            const entityId = pair.id.slice(pair.id.lastIndexOf(builder.urlGrammar.tailSeparator) + 1);
            return Effect.forEach(loaders, (loader) =>
              loader.load({ spaceId: pair.workspace, entityId }).pipe(Effect.catchAll(() => Effect.succeed(false))),
            ).pipe(Effect.tap((results) => Effect.sync(() => (confirmed[index] = results.some(Boolean)))));
          },
          { concurrency: 'unbounded' },
        );
      }

      // Loading an object does not load its container chain (e.g. the collection it lives in), which
      // `resolveUrl`'s expansion triggers but cannot synchronously await. Retry the confirmed-existing
      // planks (bounded) until their ancestors materialize, so a cold reload lands on the object.
      let resolved = yield* PathResolution.resolveUrl(builder, { workspace, pairs });
      const hasPendingConfirmed = () => pairs.some((pair, index) => confirmed[index] && !resolved[index]);
      for (let attempt = 0; attempt < RESOLVE_RETRY_ATTEMPTS && hasPendingConfirmed(); attempt++) {
        yield* Effect.sleep(RESOLVE_RETRY_INTERVAL);
        resolved = yield* PathResolution.resolveUrl(builder, { workspace, pairs });
      }

      // Planks resolve in chain order; a `companion/<variant>` pair is the deck's trailing companion,
      // not a stored plank, so it drives companionOpen + variant rather than being added to `plankIds`.
      const plankIds: string[] = [];
      let companionNodeId: string | null = null;
      pairs.forEach((pair, index) => {
        const nodeId = resolved[index]?.nodeId;
        if (pair.key === UrlPath.COMPANION_KEY) {
          if (nodeId) {
            companionNodeId = nodeId;
          }
        } else {
          plankIds.push(nodeId ?? NotFound.NOT_FOUND_PATH);
        }
      });

      // `Set` already means "override the deck's active list wholesale" — exactly a URL-driven
      // restore, for one plank or many, with no separate disposition to invent.
      yield* Operation.invoke(LayoutOperation.Set, { subject: plankIds });

      const lastPlankId = plankIds[plankIds.length - 1];
      if (lastPlankId) {
        // Attention is never serialized; on load it always defaults to the last plank in the chain.
        yield* Operation.schedule(LayoutOperation.ScrollIntoView, { subject: lastPlankId });
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
        Effect.catchAll((error) => Effect.sync(() => log.warn('failed to initialize deep link listener', { error }))),
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
      const state = getState();
      if (state.activeDeck === DEFAULT_DECK_ID) {
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
      for (const id of deck.active) {
        const represented = PathResolution.representNode(builder, id);
        if (Option.isSome(represented)) {
          representations.set(id, represented.value);
        } else {
          log.warn('plank has no URL representation; omitting from URL', { id });
        }
      }

      // The companion is the deck's trailing plank, always attached to the last plank (not the attended
      // one), and serialized as `companion/<variant>` after it.
      let companion: { plankId: string; node: PathResolution.RepresentedNode } | undefined;
      if (deck.companionOpen && deck.active.length > 0) {
        const plankId = deck.active[deck.active.length - 1];
        const selection = viewState.get(companionAspect, COMPANION_VIEW_STATE_CONTEXT);
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

    const unsubscribeState = registry.subscribe(stateAtom, () => syncUrl());
    const unsubscribeCompanionVariant = viewState.subscribe(companionAspect, COMPANION_VIEW_STATE_CONTEXT, () =>
      syncUrl(),
    );

    // The initial restore (inbound, from the launch URL snapshot) and the first outbound
    // correction wait for the app-ready signal (startup quiescence): under streaming start this
    // module can activate before eager graph builders contribute their URL keys and nodes, and
    // restoring against a half-built graph lands on not-found. The URL is snapshotted here so a
    // pre-ready outbound sync (a reactive deck-state change) cannot clobber a deep link first.
    // Daemon-forked — awaiting ready inside activation would deadlock the quiescence gate.
    const launchUrl = new URL(window.location.href);
    yield* Effect.gen(function* () {
      yield* Effect.scoped(
        Effect.gen(function* () {
          // Subscribe before consulting the fired-set: a publish between the check and the
          // subscription would otherwise be missed and hang the restore forever.
          const subscription = yield* PubSub.subscribe(manager.activation);
          if (manager.getEventsFired().includes(ActivationEvents.Startup.id)) {
            return;
          }
          for (;;) {
            const message = yield* Queue.take(subscription);
            if (message.event === ActivationEvents.Startup.id && message.state === 'activated' && !message.module) {
              return;
            }
          }
        }),
      );
      yield* provideServices(handleNavigation(launchUrl));
      // Correct a bare/stale URL against the already-persisted deck on load (see the note above).
      yield* Effect.sync(() => syncUrl('replace'));
    }).pipe(
      Effect.catchAll((error) => Effect.sync(() => log.error('initial URL restore failed', { error: String(error) }))),
      Effect.forkDaemon,
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
