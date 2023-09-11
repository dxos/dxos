//
// Copyright 2023 DXOS.org
//

import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Client, LayoutRequest, ShellLayout } from '@dxos/react-client';

export const CLIENT_PLUGIN = 'dxos.org/plugin/client';

export type ClientPluginProvides = TranslationsProvides & {
  client: Client;
  firstRun: boolean;
  setLayout: (layout: ShellLayout, options?: Omit<LayoutRequest, 'layout'>) => void;
};
