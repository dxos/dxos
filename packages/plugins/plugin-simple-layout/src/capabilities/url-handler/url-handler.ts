//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { Node } from '@dxos/plugin-graph';
import { isTauri } from '@dxos/util';

import { type SimpleLayoutState, SimpleLayoutState as SimpleLayoutStateCapability } from '../../types';

/**
 * URL handler for simple layout that syncs browser URL with layout state.
 * URL format: /{workspace} or /{workspace}/{active}
 * Root is represented as / or /root.
 *
 * On mobile Tauri, also listens for deep links via the deep-link plugin.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokeSync } = yield* Capability.get(Common.Capability.OperationInvoker);

    /**
     * Handle navigation from a pathname.
     * Parses path and updates state accordingly.
     */
    const handlePathNavigation = (pathname: string) => {
      log.info('[UrlHandler] Navigating to path', { pathname });

      // Parse URL segments: /{workspace}/{active}
      const [_, nextWorkspace, nextActive] = pathname.split('/');

      // Determine target workspace (empty or 'root' means Node.RootId).
      const targetWorkspace = !nextWorkspace || nextWorkspace === 'root' ? Node.RootId : nextWorkspace;

      // Navigate via operations (they will update state accordingly).
      invokeSync(Common.LayoutOperation.SwitchWorkspace, { subject: targetWorkspace });
      if (nextActive) {
        invokeSync(Common.LayoutOperation.Open, { subject: [nextActive] });
      }
    };

    /**
     * Handle navigation events (initial load and popstate).
     */
    const handleNavigation = () => {
      handlePathNavigation(window.location.pathname);
    };

    // TODO(wittjosiah): Instead of hardcoding redirect paths, we should either:
    //   1. Validate that the workspace exists in the graph before navigating.
    //   2. Implement more structured routing with explicit route definitions.
    /**
     * Check if a path is a special redirect path that shouldn't be navigated to.
     * These paths are handled by other systems (e.g., OAuth).
     */
    const isRedirectPath = (pathname: string): boolean => {
      return pathname.startsWith('/redirect/');
    };

    /**
     * Handle deep link URL from Tauri.
     * Parses the URL and navigates to the path (unless it's a redirect path).
     */
    const handleDeepLink = (urlString: string) => {
      log.info('[UrlHandler] Deep link received', { url: urlString });
      try {
        const url = new URL(urlString);
        // Skip redirect paths - they're handled by other systems (e.g., OAuth).
        if (isRedirectPath(url.pathname)) {
          log.info('[UrlHandler] Skipping redirect path (handled elsewhere)', { pathname: url.pathname });
          return;
        }
        handlePathNavigation(url.pathname);
      } catch (error) {
        log.warn('[UrlHandler] Failed to parse deep link URL', { urlString, error });
      }
    };

    // Handle initial URL and listen for browser navigation.
    yield* Effect.sync(() => handleNavigation());
    window.addEventListener('popstate', handleNavigation);

    // Set up deep link listener for mobile Tauri.
    let unlistenDeepLink: (() => void) | undefined;
    if (isTauri()) {
      yield* Effect.tryPromise({
        try: async () => {
          const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link');

          // Check if app was launched via deep link (cold start).
          const launchUrls = await getCurrent();
          if (launchUrls && launchUrls.length > 0) {
            log.info('[UrlHandler] App launched with deep links', { urls: launchUrls });
            for (const url of launchUrls) {
              handleDeepLink(url);
            }
          }

          // Listen for deep links while app is running.
          unlistenDeepLink = await onOpenUrl((urls) => {
            log.info('[UrlHandler] Deep links received', { urls });
            for (const url of urls) {
              handleDeepLink(url);
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

    // Subscribe to state changes to update the URL.
    let lastWorkspace: string | undefined;
    let lastActive: string | undefined;
    const unsubscribe = yield* Common.Capability.subscribeAtom(
      SimpleLayoutStateCapability,
      (state: SimpleLayoutState) => {
        const { workspace, active } = state;

        // Only update URL if relevant state changed.
        if (workspace !== lastWorkspace || active !== lastActive) {
          lastWorkspace = workspace;
          lastActive = active;

          // Build path: root is represented as /, other workspaces as /{workspace}.
          let path: string;
          if (workspace === Node.RootId) {
            path = active ? `/${Node.RootId}/${active}` : '/';
          } else {
            path = active ? `/${workspace}/${active}` : `/${workspace}`;
          }

          if (window.location.pathname !== path) {
            history.pushState(null, '', `${path}${window.location.search}`);
          }
        }
      },
    );

    return Capability.contributes(Common.Capability.Null, null, () =>
      Effect.sync(() => {
        window.removeEventListener('popstate', handleNavigation);
        unsubscribe();
        unlistenDeepLink?.();
      }),
    );
  }),
);
