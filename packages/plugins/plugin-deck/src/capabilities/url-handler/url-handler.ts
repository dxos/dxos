//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, fromUrlPath, getWorkspaceFromPath, toUrlPath } from '@dxos/app-toolkit';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Node } from '@dxos/plugin-graph';
import { isTauri } from '@dxos/util';

import { DeckCapabilities, type DeckStateProps, defaultDeck } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const stateAtom = yield* Capability.get(DeckCapabilities.State);
    const navigationHandlers = yield* Capability.getAll(AppCapabilities.NavigationHandler);

    const getState = () => registry.get(stateAtom);

    const getDeck = () => {
      const state = getState();
      const deck = state.decks[state.activeDeck];
      invariant(deck, `Deck not found: ${state.activeDeck}`);
      return deck;
    };

    const updateState = (fn: (current: DeckStateProps) => DeckStateProps) => {
      registry.set(stateAtom, fn(getState()));
    };

    /** Dispatch URL to all registered NavigationHandler contributions. */
    const dispatchNavigationHandlers = (url: URL) => {
      void Promise.allSettled(navigationHandlers.map((handler) => handler(url)));
    };

    const handleNavigation = async (url?: URL) => {
      const resolvedUrl = url ?? new URL(window.location.href);
      dispatchNavigationHandlers(resolvedUrl);

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
        await invokePromise(LayoutOperation.SwitchWorkspace, { subject: workspace });
      }

      const deck = getDeck();
      const activeId = qualifiedId !== workspace ? qualifiedId : undefined;
      if (activeId) {
        await invokePromise(LayoutOperation.Open, { subject: [activeId] });
        if (!deck.solo) {
          await invokePromise(LayoutOperation.SetLayoutMode, { subject: activeId, mode: 'solo' });
        }
      } else if (deck.solo) {
        const path = toUrlPath(deck.solo);
        if (window.location.pathname !== path) {
          history.replaceState(null, '', `${path}${window.location.search}`);
        }
      }
    };

    // Initial navigation.
    yield* Effect.promise(() => handleNavigation());
    window.addEventListener('popstate', () => void handleNavigation());

    // Tauri deep link support.
    let unlistenDeepLink: (() => void) | undefined;
    if (isTauri()) {
      yield* Effect.tryPromise({
        try: async () => {
          const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link');

          const launchUrls = await getCurrent();
          if (launchUrls && launchUrls.length > 0) {
            log.info('[UrlHandler] App launched with deep links', { urls: launchUrls });
            for (const urlString of launchUrls) {
              void handleDeepLink(urlString, handleNavigation);
            }
          }

          unlistenDeepLink = await onOpenUrl((urls) => {
            log.info('[UrlHandler] Deep links received', { urls });
            for (const urlString of urls) {
              void handleDeepLink(urlString, handleNavigation);
            }
          });
        },
        catch: (error) => {
          log.warn('[UrlHandler] Failed to initialize deep link listener', { error });
          return error;
        },
      }).pipe(Effect.catchAll(() => Effect.void));
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

        const path = solo ? toUrlPath(solo) : toUrlPath(activeDeck);
        if (window.location.pathname !== path) {
          history.pushState(null, '', `${path}${window.location.search}`);
        }
      }
    });

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        window.removeEventListener('popstate', () => void handleNavigation());
        unsubscribe();
        unlistenDeepLink?.();
      }),
    );
  }),
);

/** Check if a path is a redirect path handled elsewhere (e.g., OAuth). */
const isRedirectPath = (pathname: string): boolean => pathname.startsWith('/redirect/');

/** Handle a deep link URL string. Merges query params into window.location and navigates. */
const handleDeepLink = async (urlString: string, navigate: (url?: URL) => Promise<void>): Promise<void> => {
  log.info('[UrlHandler] Deep link received', { url: urlString });
  try {
    const deepLinkUrl = new URL(urlString);

    // For custom schemes (e.g., composer://a/b/c), new URL() treats the first segment as the
    // hostname. Reconstruct the full path from hostname + pathname.
    const fullPath = deepLinkUrl.protocol !== 'https:' && deepLinkUrl.protocol !== 'http:' && deepLinkUrl.hostname
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

    await navigate(current);
  } catch (error) {
    log.warn('[UrlHandler] Failed to parse deep link URL', { urlString, error });
  }
};
