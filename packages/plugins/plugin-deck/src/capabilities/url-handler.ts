//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit imports so the emitted `.d.ts` references the packages via their public aliases
// instead of relative `node_modules` paths (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Graph, type GraphBuilder } from '@dxos/app-graph';
import { AppCapabilities, LayoutOperation, NotFound, Paths } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';
import { Node } from '@dxos/plugin-graph';
import { isTauri } from '@dxos/util';

import { DeckCapabilities, type StoredDeckState, defaultDeck } from '#types';

import { updateActiveDeck } from '../operations/helpers';
import { deserializePlanks, serializePlanks, stripPlanks } from '../util';
import { shouldDeferNavigationHandlers } from './check-app-scheme';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const operationService = yield* Capabilities.OperationInvoker;
    const navigationHandlers = yield* AppCapabilities.NavigationHandler;
    const registry = yield* Capabilities.AtomRegistry;
    const stateAtom = yield* DeckCapabilities.State;
    const settingsAtom = yield* DeckCapabilities.Settings;
    const { graph } = yield* AppCapabilities.AppGraph;

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
      const state = getState();
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

      const qualifiedId = Paths.fromUrlPath(pathname);
      const workspace = Paths.getWorkspaceFromPath(qualifiedId);
      if (workspace !== Node.RootId && workspace !== state.activeDeck) {
        yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: workspace });
      }

      const deck = getDeck();
      const activeId = qualifiedId !== workspace ? qualifiedId : undefined;
      if (activeId) {
        // Ensure the object referenced by the URL is open in the deck.
        // Open validates the target and may redirect to 404, returning the resolved IDs.
        const resolvedIds = yield* Operation.invoke(LayoutOperation.Open, { subject: [activeId] });
        // If not already in solo mode, switch to solo for the resolved target.
        if (!deck.solo) {
          yield* Operation.invoke(LayoutOperation.SetLayoutMode, {
            subject: resolvedIds?.[0] ?? activeId,
            mode: 'solo',
          });
        }
      } else if (deck.solo && deck.solo !== NotFound.NOT_FOUND_PATH) {
        // Stay in solo mode; redirect URL to reflect the current solo item.
        // Do not switch to deck mode here — only explicit user action should change layout mode.
        const path = Paths.toUrlPath(deck.solo);
        if (window.location.pathname !== path) {
          history.replaceState(null, '', `${path}${stripPlanks(window.location.search)}`);
        }
      } else if (!activeId && !deck.solo) {
        // Multi-mode: restore planks from query params.
        const plankIds = deserializePlanks(resolvedUrl);
        if (plankIds.length > 0) {
          for (const plankId of plankIds) {
            NotFound.expandPath(graph, plankId);
          }
          updateState((state) => updateActiveDeck(state, { active: plankIds, initialized: true }));
        }
      }
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

    // Sync URL with layout state changes.
    let lastSolo: string | undefined;
    let lastActiveDeck: string | undefined;
    let lastActiveKey: string | undefined;
    const unsubscribe = registry.subscribe(stateAtom, () => {
      const state = getState();
      const deck = getDeck();
      const solo = deck.solo;
      const activeDeck = state.activeDeck;
      const activeKey = solo ? undefined : JSON.stringify(deck.active);

      if (solo !== lastSolo || activeDeck !== lastActiveDeck || activeKey !== lastActiveKey) {
        lastSolo = solo;
        lastActiveDeck = activeDeck;
        lastActiveKey = activeKey;

        const path = solo && solo !== NotFound.NOT_FOUND_PATH ? Paths.toUrlPath(solo) : Paths.toUrlPath(activeDeck);
        const search = !solo
          ? serializePlanks(deck.active, window.location.search)
          : stripPlanks(window.location.search);
        const newUrl = `${path}${search}`;

        if (`${window.location.pathname}${window.location.search}` !== newUrl) {
          history.pushState(null, '', newUrl);
        }
      }
    });

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        window.removeEventListener('popstate', onPopState);
        if ('navigation' in window) {
          window.navigation.removeEventListener('currententrychange', onCurrentEntryChange);
        }
        unsubscribe();
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
