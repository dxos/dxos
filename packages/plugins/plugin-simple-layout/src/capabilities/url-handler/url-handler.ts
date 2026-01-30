//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { Node } from '@dxos/plugin-graph';

import { type SimpleLayoutState, SimpleLayoutState as SimpleLayoutStateCapability } from '../../types';

/**
 * URL handler for simple layout that syncs browser URL with layout state.
 * URL format: /{workspace} or /{workspace}/{active}
 * Root is represented as / or /root.
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

      // Determine target workspace (empty or 'root' means Node.RootId).
      const targetWorkspace = !nextWorkspace || nextWorkspace === 'root' ? Node.RootId : nextWorkspace;

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
      }),
    );
  }),
);
