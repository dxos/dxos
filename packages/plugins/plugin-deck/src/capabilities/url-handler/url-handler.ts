//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import {
  AppCapabilities,
  LayoutOperation,
  NOT_FOUND_PATH,
  fromUrlPath,
  getWorkspaceFromPath,
  toUrlPath,
} from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { Node } from '@dxos/plugin-graph';
import { isTauri } from '@dxos/util';

import { shouldDeferNavigationHandlers } from '../check-app-scheme/check-app-scheme';
import { DeckCapabilities, type StoredDeckState, defaultDeck } from '../../types';

/** Dispatch all NavigationHandler contributions with a given URL. */
const dispatchNavigationHandlers = Effect.fn(function* (url: URL) {
  const handlers = yield* Capability.getAll(AppCapabilities.NavigationHandler);
  yield* Effect.all(
    handlers.map((handler) => handler(url)),
    { concurrency: 'unbounded' },
  );
});

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const operationService = yield* Capability.get(Capabilities.OperationInvoker);
    const capabilities = yield* Capability.Service;
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const stateAtom = yield* Capability.get(DeckCapabilities.State);
    const settingsAtom = yield* Capability.get(DeckCapabilities.Settings);

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

      const qualifiedId = fromUrlPath(pathname);
      const workspace = getWorkspaceFromPath(qualifiedId);
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
      } else if (deck.solo && deck.solo !== NOT_FOUND_PATH) {
        // Stay in solo mode; redirect URL to reflect the current solo item.
        // Do not switch to deck mode here — only explicit user action should change layout mode.
        const path = toUrlPath(deck.solo);
        if (window.location.pathname !== path) {
          history.replaceState(null, '', `${path}${window.location.search}`);
        }
      }
    });

    const onPopState = () => void runAndForwardErrors(provideServices(handleNavigation()));

    // Initial navigation.
    yield* handleNavigation();
    window.addEventListener('popstate', onPopState);

    // Tauri deep link support.
    let unlistenDeepLink: (() => void) | undefined;
    if (isTauri()) {
      yield* Effect.gen(function* () {
        const { getCurrent, onOpenUrl } = yield* Effect.promise(() => import('@tauri-apps/plugin-deep-link'));

        const launchUrls = yield* Effect.promise(() => getCurrent());
        if (launchUrls && launchUrls.length > 0) {
          log('app launched with deep links', { urls: launchUrls });
          for (const urlString of launchUrls) {
            yield* handleDeepLink(urlString, handleNavigation);
          }
        }

        unlistenDeepLink = yield* Effect.promise(() =>
          onOpenUrl((urls) => {
            for (const urlString of urls) {
              void runAndForwardErrors(provideServices(handleDeepLink(urlString, handleNavigation)));
            }
          }),
        );
      }).pipe(Effect.catchAll((error) => Effect.sync(() => log.warn('failed to initialize deep link listener', { error }))));
    }

    // Sync URL with layout state changes.
    let lastSolo: string | undefined;
    let lastActiveDeck: string | undefined;
    const unsubscribe = registry.subscribe(stateAtom, () => {
      const state = getState();
      const deck = getDeck();
      const solo = deck.solo;
      const activeDeck = state.activeDeck;

      if (solo !== lastSolo || activeDeck !== lastActiveDeck) {
        lastSolo = solo;
        lastActiveDeck = activeDeck;

        const path = solo && solo !== NOT_FOUND_PATH ? toUrlPath(solo) : toUrlPath(activeDeck);
        if (window.location.pathname !== path) {
          history.pushState(null, '', `${path}${window.location.search}`);
        }
      }
    });

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        window.removeEventListener('popstate', onPopState);
        unsubscribe();
        unlistenDeepLink?.();
      }),
    );
  }),
);

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
