//
// Copyright 2023 DXOS.org
//

import { useEffect } from 'react';

import { selectedToUri, uriToSelected, useTreeView } from '@braneframe/plugin-treeview';
import { observer } from '@dxos/observable-object/react';
import { definePlugin, PluginDefinition } from '@dxos/react-surface';

export const UrlSyncPlugin: PluginDefinition = definePlugin({
  meta: {
    id: 'dxos:url-sync',
  },
  provides: {
    components: {
      default: observer(() => {
        const treeView = useTreeView();

        // If no selection, try to restore from URL.
        useEffect(() => {
          if (treeView.selected.length === 0 && window.location.pathname.length > 1) {
            treeView.selected = uriToSelected(window.location.pathname);
          }
        }, []);

        // Update URL when selection changes.
        useEffect(() => {
          const selectedPath = selectedToUri(treeView.selected);
          if (window.location.pathname !== selectedPath) {
            history.pushState(null, '', selectedPath);
          }
        }, [treeView.selected]);

        return null;
      }),
    },
  },
});
