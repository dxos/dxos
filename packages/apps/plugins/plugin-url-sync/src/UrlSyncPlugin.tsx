//
// Copyright 2023 DXOS.org
//

import { useEffect } from 'react';

import { selectedToUri, uriToSelected, useTreeView } from '@braneframe/plugin-treeview';
import { PluginDefinition } from '@dxos/react-surface';

export const UrlSyncPlugin = (): PluginDefinition => ({
  meta: {
    id: 'dxos:url-sync',
  },
  provides: {
    components: {
      default: () => {
        const treeView = useTreeView();

        // Update selection based on browser navigation.
        useEffect(() => {
          const handleNavigation = () => {
            treeView.selected =
              // TODO(wittjosiah): Remove. This is here for backwards compatibility.
              window.location.pathname === '/embedded'
                ? ['dxos:github/embedded']
                : uriToSelected(window.location.pathname);
          };

          if (treeView.selected.length === 0 && window.location.pathname.length > 1) {
            handleNavigation();
          }

          window.addEventListener('popstate', handleNavigation);
          return () => {
            window.removeEventListener('popstate', handleNavigation);
          };
        }, []);

        // Update URL when selection changes.
        useEffect(() => {
          const selectedPath = selectedToUri(treeView.selected);
          if (window.location.pathname !== selectedPath) {
            // TODO(wittjosiah): Better support for search params?
            history.pushState(null, '', `${selectedPath}${window.location.search}`);
          }
        }, [treeView.selected]);

        return null;
      },
    },
  },
});
