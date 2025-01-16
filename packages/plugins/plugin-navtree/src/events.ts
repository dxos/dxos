//
// Copyright 2025 DXOS.org
//

import { Events } from '@dxos/app-framework';

import { NAVTREE_PLUGIN } from './meta';

export namespace NavTreeEvents {
  export const StateReady = Events.createStateEvent(NAVTREE_PLUGIN);
}
