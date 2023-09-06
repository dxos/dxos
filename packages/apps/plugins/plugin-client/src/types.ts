//
// Copyright 2023 DXOS.org
//

import { Client, LayoutRequest, ShellLayout } from '@dxos/react-client';

export const CLIENT_PLUGIN = 'dxos.org/plugin/client';

export type ClientPluginProvides = {
  client: Client;
  firstRun: boolean;
  setLayout: (layout: ShellLayout, options?: Omit<LayoutRequest, 'layout'>) => void;
};
