//
// Copyright 2025 DXOS.org
//

import { Events, ActivationEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace NavTreeEvents {
  export const StateReady: ActivationEvent.ActivationEvent = Events.createStateEvent(meta.id);
}
