//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, type LayoutParts } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';

import { NAV_ID } from '../../components';

// NOTE: The key is this currently for backwards compatibility of storage.
const LOCATION_KEY = 'dxos.org/settings/layout';

export default () => {
  // TODO(wittjosiah): This active state is not a generic navigation state but quite deck specific.
  //   It is also closely tied to the layout mode state (which also seems quite deck specific).
  //   The layout and navigation interfaces need to be revisited and cleaned up.
  //   Doing this cleanup should also help simplify some of the convoluted logic for managing it.
  const location = new LocalStorageStore<Capabilities.MutableLocation>(LOCATION_KEY, {
    active: { sidebar: [{ id: NAV_ID }] },
    closed: [],
  });

  location
    .prop({ key: 'active', type: LocalStorageStore.json<LayoutParts>() })
    .prop({ key: 'closed', type: LocalStorageStore.json<string[]>() });

  return contributes(Capabilities.Location, location.values, () => location.close());
};
