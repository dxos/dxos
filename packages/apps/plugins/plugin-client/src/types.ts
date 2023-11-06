//
// Copyright 2023 DXOS.org
//

import { type Client } from '@dxos/react-client';

export const CLIENT_PLUGIN = 'dxos.org/plugin/client';

export type ClientPluginProvides = {
  client: Client;

  /**
   * True if this is the first time the current app has been used by this identity.
   */
  firstRun: boolean;
};
