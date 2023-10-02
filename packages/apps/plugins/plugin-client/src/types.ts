//
// Copyright 2023 DXOS.org
//

import { DndProvides } from '@braneframe/plugin-dnd';
import { Client } from '@dxos/react-client';

export const CLIENT_PLUGIN = 'dxos.org/plugin/client';

export type ClientPluginProvides = DndProvides & {
  client: Client;
  firstRun: boolean;
};
