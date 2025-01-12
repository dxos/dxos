//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type LayoutMode, type Layout } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

// NOTE: The key is this currently for backwards compatibility of storage.
const LAYOUT_KEY = 'dxos.org/settings/layout';

export default () => {
  const layout = new LocalStorageStore<Layout>(LAYOUT_KEY, {
    layoutMode: 'solo',
    sidebarOpen: true,
    complementarySidebarOpen: false,
    dialogContent: null,
    dialogOpen: false,
    dialogBlockAlign: undefined,
    dialogType: undefined,
    popoverContent: null,
    popoverAnchorId: undefined,
    popoverOpen: false,
    toasts: [],
  });

  layout
    .prop({ key: 'layoutMode', type: LocalStorageStore.enum<LayoutMode>() })
    .prop({ key: 'sidebarOpen', type: LocalStorageStore.bool() })
    .prop({ key: 'complementarySidebarOpen', type: LocalStorageStore.bool() });

  return contributes(Capabilities.Layout, layout.values, () => layout.close());
};
