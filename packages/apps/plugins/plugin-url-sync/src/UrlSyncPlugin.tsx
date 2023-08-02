//
// Copyright 2023 DXOS.org
//

import { useEffect } from 'react';

import { activeToUri, uriToActive, useTreeView } from '@braneframe/plugin-treeview';
import { PluginDefinition } from '@dxos/react-surface';

export const UrlSyncPlugin = (): PluginDefinition => ({
  meta: {
    id: 'dxos.org/plugin/url-sync',
  },
  provides: {
    components: {
      default: () => {
        const treeView = useTreeView();

        // Update selection based on browser navigation.
        useEffect(() => {
          const handleNavigation = () => {
            treeView.active =
              // TODO(wittjosiah): Remove condition. This is here for backwards compatibility.
              window.location.pathname === '/embedded' ? ['github/embedded'] : uriToActive(window.location.pathname);
          };

          if (treeView.active.length === 0 && window.location.pathname.length > 1) {
            handleNavigation();
          }

          window.addEventListener('popstate', handleNavigation);
          return () => {
            window.removeEventListener('popstate', handleNavigation);
          };
        }, []);

        // Update URL when selection changes.
        useEffect(() => {
          const selectedPath = activeToUri(treeView.active);
          if (window.location.pathname !== selectedPath) {
            // TODO(wittjosiah): Better support for search params?
            history.pushState(null, '', `${selectedPath}${window.location.search}`);
          }
        }, [treeView.active]);

        return null;
      },
    },
  },
});
