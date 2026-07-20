//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { PathResolution } from '@dxos/app-graph';
import { AppCapabilities, LayoutOperation, NotFound, Paths, UrlPath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { linkedSegment } from '@dxos/react-ui-attention';
import { isTauri } from '@dxos/util';

import { DeckCapabilities, type StoredDeckState, defaultDeck } from '#types';

import { COMPANION_VIEW_STATE_CONTEXT, companionVariantAspect, serializeDeckToUrl } from '../util';
import { shouldDeferNavigationHandlers } from './check-app-scheme';

/** Bounded retry for URL resolution while a cold restore's container chain finishes loading. */
const RESOLVE_RETRY_ATTEMPTS = 15;
const RESOLVE_RETRY_INTERVAL = '150 millis';

/** Dispatch all NavigationHandler contributions with a given URL. */
const dispatchNavigationHandlers = Effect.fn(function* (url: URL) {
  const handlers = yield* Capability.getAll(AppCapabilities.NavigationHandler);
  yield* Effect.all(
    handlers.map((handler) => handler(url)),
    { concurrency: 'unbounded' },
  );
});

/** Strip the `root/` prefix off a qualified workspace path, back to the bare `UrlPath` workspace token. */
const bareWorkspace = (qualifiedWorkspace: string): string => {
  const [, workspace] = qualifiedWorkspace.split('/');
  return workspace ?? qualifiedWorkspace;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const operationService = yield* Capability.get(Capabilities.OperationInvoker);
    const capabilities = yield* Capability.Service;
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const stateAtom = yield* Capability.get(DeckCapabilities.State);
    const settingsAtom = yield* Capability.get(DeckCapabilities.Settings);
    const attention = yield* Capability.get(AttentionCapabilities.Attention);
    const viewState = yield* Capability.get(AttentionCapabilities.ViewState);

    const provideServices = <A, E>(effect: Effect.Effect<A, E, Capability.Service | Operation.Service>) =>
      effect.pipe(
        Effect.provideService(Capability.Service, capabilities),
        Effect.provideService(Operation.Service, operationService),
      );

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
      const { builder } = yield* Capability.get(AppCapabilities.AppGraph);
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
          activeDeck: 'default',
          decks: {
            default: { ...defaultDeck },
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

      const keyTable = PathResolution.buildUrlKeyTable(builder);
      const parsed = UrlPath.parse(pathname, keyTable);
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
      const workspacePath = Paths.getSpacePath(workspace);
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
      const loaders = yield* Capability.getAll(AppCapabilities.NavigationTargetLoader);
      const confirmed = new Array<boolean>(pairs.length).fill(false);
      if (loaders.length > 0) {
        yield* Effect.forEach(
          pairs,
          (pair, index) => {
            if (pair.id === undefined) {
              return Effect.void;
            }
            const entityId = pair.id;
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
      const hasPendingConfirmed = () =>
        pairs.some((pair, index) => pair.id !== undefined && confirmed[index] && !resolved[index]);
      for (let attempt = 0; attempt < RESOLVE_RETRY_ATTEMPTS && hasPendingConfirmed(); attempt++) {
        yield* Effect.sleep(RESOLVE_RETRY_INTERVAL);
        resolved = yield* PathResolution.resolveUrl(builder, { workspace, pairs });
      }

      // Planks resolve in chain order; a companion (id-less) pair attaches to the preceding plank but
      // is not itself a plank, so it's tracked separately rather than added to `plankIds`.
      const plankIds: string[] = [];
      let companionNodeId: string | null = null;
      pairs.forEach((pair, index) => {
        const nodeId = resolved[index]?.nodeId;
        if (pair.id !== undefined) {
          plankIds.push(nodeId ?? NotFound.NOT_FOUND_PATH);
        } else if (nodeId) {
          companionNodeId = nodeId;
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

    yield* provideServices(handleNavigation());
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

    // The graph builder instance is stable for the app's lifetime once contributed (it's created once
    // by plugin-graph); handleNavigation above already required it to be ready, so it's safe to read
    // once more here for the outbound (state -> URL) sync closures below.
    const { builder } = yield* Capability.get(AppCapabilities.AppGraph);

    // Sync URL with layout state changes: deck state (active planks, companion open/closed),
    // attention (which plank the companion attaches to), and the companion's selected variant.
    // `method: 'replace'` is used once, right after setup, to correct a stale/bare URL against the
    // already-persisted deck without adding a spurious back-history entry; every later firing (a real
    // state change) pushes.
    const syncUrl = (method: 'push' | 'replace' = 'push') => {
      const state = getState();
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

      let companion: { attendedId: string; node: PathResolution.RepresentedNode } | undefined;
      if (deck.companionOpen && deck.active.length > 0) {
        const [attendedId] = attention.getCurrent();
        const plankId =
          attendedId && deck.active.includes(attendedId) ? attendedId : deck.active[deck.active.length - 1];
        const selection = viewState.get(companionVariantAspect, COMPANION_VIEW_STATE_CONTEXT);
        if (plankId && selection.variant) {
          const companionNodeId = `${plankId}/${linkedSegment(selection.variant)}`;
          const represented = PathResolution.representNode(builder, companionNodeId);
          if (Option.isSome(represented)) {
            companion = { attendedId: plankId, node: represented.value };
          }
        }
      }

      const path = serializeDeckToUrl({ workspace, active: deck.active, representations, companion });
      const newUrl = `${path}${window.location.search}`;

      // Update only when the derived URL actually differs from the current one — the deck state atom
      // and the attention/companion-variant atoms all funnel into this same recompute, so most firings
      // are no-ops.
      if (`${window.location.pathname}${window.location.search}` !== newUrl) {
        if (method === 'replace') {
          history.replaceState(null, '', newUrl);
        } else {
          history.pushState(null, '', newUrl);
        }
      }
    };

    const unsubscribeState = registry.subscribe(stateAtom, () => syncUrl());
    const unsubscribeAttention = attention.subscribeCurrent(() => syncUrl());
    const unsubscribeCompanionVariant = viewState.subscribe(companionVariantAspect, COMPANION_VIEW_STATE_CONTEXT, () =>
      syncUrl(),
    );
    // Correct a bare/stale URL against the already-persisted deck on load (see the note above).
    syncUrl('replace');

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        window.removeEventListener('popstate', onPopState);
        if ('navigation' in window) {
          window.navigation.removeEventListener('currententrychange', onCurrentEntryChange);
        }
        unsubscribeState();
        unsubscribeAttention();
        unsubscribeCompanionVariant();
        unlistenDeepLink?.();
      }),
    );
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
