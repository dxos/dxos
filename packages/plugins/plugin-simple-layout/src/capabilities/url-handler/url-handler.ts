//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, LayoutOperation, fromUrlPath, getWorkspaceFromPath, toUrlPath } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import { type SimpleLayoutState, SimpleLayoutState as SimpleLayoutStateCapability } from '../../types';

/**
 * URL handler for simple layout that syncs browser URL with layout state.
 * URL paths map directly to qualified graph IDs with the leading `root` segment stripped.
 * Root is represented as `/`.
 *
 * On Tauri, also listens for deep links via the deep-link plugin.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
    const navigationHandlers = yield* Capability.getAll(AppCapabilities.NavigationHandler);

    /** Dispatch URL to all registered NavigationHandler contributions. */
    const dispatchNavigationHandlers = (url: URL) => {
      void Promise.allSettled(navigationHandlers.map((handler) => handler(url)));
    };

    /**
     * Handle navigation from a URL.
     * Dispatches to NavigationHandler contributions, then handles pathname routing.
     */
    const handlePathNavigation = (url?: URL) => {
      const resolvedUrl = url ?? new URL(window.location.href);
      dispatchNavigationHandlers(resolvedUrl);

      let pathname = resolvedUrl.pathname;
      if (isFilePath(pathname)) {
        log.info('[UrlHandler] Skipping file path (not a graph node)', { pathname });
        pathname = '/';
      }

      const qualifiedId = fromUrlPath(pathname);
      const workspace = getWorkspaceFromPath(qualifiedId);

      void invokePromise(LayoutOperation.SwitchWorkspace, { subject: workspace });

      const activeId = qualifiedId !== workspace ? qualifiedId : undefined;
      if (activeId) {
        void invokePromise(LayoutOperation.Open, { subject: [activeId] });
      }
    };

    // Initial navigation.
    yield* Effect.sync(() => handlePathNavigation());
    window.addEventListener('popstate', () => handlePathNavigation());

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
              handleDeepLink(urlString, handlePathNavigation);
            }
          }

          unlistenDeepLink = await onOpenUrl((urls) => {
            log.info('[UrlHandler] Deep links received', { urls });
            for (const urlString of urls) {
              handleDeepLink(urlString, handlePathNavigation);
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
    let lastWorkspace: string | undefined;
    let lastActive: string | undefined;
    const unsubscribe = yield* Capabilities.subscribeAtom(SimpleLayoutStateCapability, (state: SimpleLayoutState) => {
      const { workspace, active } = state;

      if (workspace !== lastWorkspace || active !== lastActive) {
        lastWorkspace = workspace;
        lastActive = active;

        const path = active ? toUrlPath(active) : toUrlPath(workspace);
        if (window.location.pathname !== path) {
          history.pushState(null, '', `${path}${window.location.search}`);
        }
      }
    });

    return Capability.contributes(Capabilities.Null, null, () =>
      Effect.sync(() => {
        window.removeEventListener('popstate', () => handlePathNavigation());
        unsubscribe();
        unlistenDeepLink?.();
      }),
    );
  }),
);

/** Check if a path is a redirect path handled elsewhere (e.g., OAuth). */
const isRedirectPath = (pathname: string): boolean => pathname.startsWith('/redirect/');

/** Paths with file extensions are not graph node paths. */
const isFilePath = (pathname: string): boolean => /\.[a-z]+$/i.test(pathname);

/** Handle a deep link URL string. Merges query params into window.location and navigates. */
const handleDeepLink = (urlString: string, navigate: (url?: URL) => void): void => {
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

    navigate(current);
  } catch (error) {
    log.warn('[UrlHandler] Failed to parse deep link URL', { urlString, error });
  }
};
