//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';

import { type SimpleLayoutState, SimpleLayoutState as SimpleLayoutStateCapability } from '../../types';
import { HOME_ID } from '../state';

/**
 * URL handler for simple layout that syncs browser URL with layout state.
 * URL format: /{workspace} or /{workspace}/{active}
 * Home is represented as / or /home.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokeSync } = yield* Capability.get(Common.Capability.OperationInvoker);

    /**
     * Handle navigation events (initial load and popstate).
     * Parses URL and updates state accordingly.
     */
    const handleNavigation = () => {
      const pathname = window.location.pathname;

      // Parse URL segments: /{workspace}/{active}
      const [_, nextWorkspace, nextActive] = pathname.split('/');

      // Determine target workspace (empty or 'home' means HOME_ID).
      const targetWorkspace = !nextWorkspace || nextWorkspace === 'home' ? HOME_ID : nextWorkspace;

      // Navigate via operations (they will update state accordingly).
      invokeSync(Common.LayoutOperation.SwitchWorkspace, { subject: targetWorkspace });
      if (nextActive) {
        invokeSync(Common.LayoutOperation.Open, { subject: [nextActive] });
      }
    };

    // Handle initial URL and listen for browser navigation.
    yield* Effect.sync(() => handleNavigation());
    window.addEventListener('popstate', handleNavigation);

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

          // Build path: home is represented as /, other workspaces as /{workspace}.
          let path: string;
          if (workspace === HOME_ID) {
            path = active ? `/${HOME_ID}/${active}` : '/';
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
      }),
    );
  }),
);
