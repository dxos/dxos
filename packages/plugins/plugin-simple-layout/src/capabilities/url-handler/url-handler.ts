//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, fromUrlPath, getWorkspaceFromPath, toUrlPath } from '@dxos/app-toolkit';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import { type SimpleLayoutState, SimpleLayoutState as SimpleLayoutStateCapability } from '../../types';

/**
 * URL handler for simple layout that syncs browser URL with layout state.
 * URL paths map directly to qualified graph IDs with the leading `root` segment stripped.
 * Root is represented as `/`.
 *
 * On mobile Tauri, also listens for deep links via the deep-link plugin.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);

    /**
     * Handle navigation from a pathname.
     * Restores the qualified graph ID and dispatches layout operations.
     */
    const handlePathNavigation = (pathname: string) => {
      if (isFilePath(pathname)) {
        log.info('[UrlHandler] Skipping file path (not a graph node)', { pathname });
        pathname = '/';
      }

      log.info('[UrlHandler] Navigating to path', { pathname });

      const qualifiedId = fromUrlPath(pathname);
      const workspace = getWorkspaceFromPath(qualifiedId);

      void invokePromise(LayoutOperation.SwitchWorkspace, { subject: workspace });

      const activeId = qualifiedId !== workspace ? qualifiedId : undefined;
      if (activeId) {
        void invokePromise(LayoutOperation.Open, { subject: [activeId] });
      }
    };

    const onNavigation = handleNavigation(handlePathNavigation);

    yield* Effect.sync(() => onNavigation());
    window.addEventListener('popstate', onNavigation);

    let unlistenDeepLink: (() => void) | undefined;
    if (isTauri()) {
      yield* Effect.tryPromise({
        try: async () => {
          const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link');

          const launchUrls = await getCurrent();
          if (launchUrls && launchUrls.length > 0) {
            log.info('[UrlHandler] App launched with deep links', { urls: launchUrls });
            for (const url of launchUrls) {
              handleDeepLink(url, handlePathNavigation);
            }
          }

          unlistenDeepLink = await onOpenUrl((urls) => {
            log.info('[UrlHandler] Deep links received', { urls });
            for (const url of urls) {
              handleDeepLink(url, handlePathNavigation);
            }
          });

          log.info('[UrlHandler] Deep link listener initialized');
        },
        catch: (error) => {
          log.warn('[UrlHandler] Failed to initialize deep link listener', { error });
          return error;
        },
      }).pipe(Effect.catchAll(() => Effect.void));
    }

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
        window.removeEventListener('popstate', onNavigation);
        unsubscribe();
        unlistenDeepLink?.();
      }),
    );
  }),
);

/**
 * Check if a path is a special redirect path that shouldn't be navigated to.
 * These paths are handled by other systems (e.g., OAuth).
 */
const isRedirectPath = (pathname: string): boolean => pathname.startsWith('/redirect/');

/**
 * Paths with file extensions (e.g., `/iframe.html`) are not graph node paths.
 * This guards against embedded contexts like Storybook iframes interpreting
 * the host pathname as a navigation target.
 */
const isFilePath = (pathname: string): boolean => /\.[a-z]+$/i.test(pathname);

/**
 * Returns a handler for navigation events (initial load and popstate) that navigates to current pathname.
 */
const handleNavigation =
  (navigate: (pathname: string) => void): (() => void) =>
  () =>
    navigate(window.location.pathname);

/**
 * Handle deep link URL from Tauri. Parses the URL and calls navigate unless it's a redirect path.
 */
const handleDeepLink = (urlString: string, navigate: (pathname: string) => void): void => {
  log.info('[UrlHandler] Deep link received', { url: urlString });
  try {
    const url = new URL(urlString);
    if (isRedirectPath(url.pathname)) {
      log.info('[UrlHandler] Skipping redirect path (handled elsewhere)', { pathname: url.pathname });
      return;
    }
    navigate(url.pathname);
  } catch (error) {
    log.warn('[UrlHandler] Failed to parse deep link URL', { urlString, error });
  }
};
