//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import { DeckOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Invoked rather than run here: the operation declares the services its handler needs and the
    // process runtime supplies them, which a DOM event listener has no Effect context to do.
    const operations = yield* Capabilities.OperationInvoker;
    const project = (url?: URL) => operations.invokePromise(DeckOperation.HandleExternalUrl, { url: url?.href });

    const onPopState = () => void project();

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
            yield* Effect.promise(() => handleDeepLink(urlString, project));
          }
        }

        unlistenDeepLink = yield* Effect.promise(() =>
          onOpenUrl((urls) => {
            for (const urlString of urls) {
              void handleDeepLink(urlString, project);
            }
          }),
        );
      }).pipe(
        Effect.catch((error) => Effect.sync(() => log.warn('failed to initialize deep link listener', { error }))),
      );
    }

    // Not awaited: this module sits on the startup pass, and the restore can wait for late-arriving
    // URL keys, which would hold the whole pass and the boot loader with it.
    void project();

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        window.removeEventListener('popstate', onPopState);
        if ('navigation' in window) {
          window.navigation.removeEventListener('currententrychange', onCurrentEntryChange);
        }
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
const handleDeepLink = async (urlString: string, navigate: (url?: URL) => Promise<unknown>) => {
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

  await navigate(current);
};
