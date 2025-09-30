//
// Copyright 2025 DXOS.org
//

import { Events } from '@dxos/app-framework';

import { meta } from './meta';

export namespace NavTreeEvents {
  export const StateReady = Events.createStateEvent(meta.id);
}
