//
// Copyright 2023 DXOS.org
//

import { Client, LayoutRequest, ShellLayout } from '@dxos/react-client';

export type ClientPluginProvides = {
  client: Client;
  firstRun: boolean;
  setLayout: (layout: ShellLayout, options?: Omit<LayoutRequest, 'layout'>) => void;
};
