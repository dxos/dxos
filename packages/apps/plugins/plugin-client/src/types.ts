//
// Copyright 2023 DXOS.org
//

import { type Client } from '@dxos/react-client';

export const CLIENT_PLUGIN = 'dxos.org/plugin/client';

export type ClientPluginProvides = {
  client: Client;

  /**
   * True if this is the first time this device has been used.
   * Indicates that the identity was created during startup.
   */
  firstRun: boolean;
};
