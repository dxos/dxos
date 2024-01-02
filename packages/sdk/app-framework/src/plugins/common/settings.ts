//
// Copyright 2023 DXOS.org
//

import { type Plugin } from '../PluginHost';

// TODO(burdon): Plugins should export ts-effect object (see local-storage).
// TODO(burdon): Auto generate form.
// TODO(burdon): Set surface's data.type to plugin id (allow custom settings surface).

export type SettingsProvides<T> = {
  settings: {
    meta: Plugin['meta'];
    values: T; // TODO(burdon): Read-only?
  };
};
