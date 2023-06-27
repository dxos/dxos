//
// Copyright 2023 DXOS.org
//

import { Client, ShellController } from '@dxos/react-client';

export type ClientPluginProvides = {
  client: Client;
  setLayout: ShellController['setLayout'];
};
