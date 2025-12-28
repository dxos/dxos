//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Events } from '@dxos/app-framework';

import { meta } from './meta';

export namespace DeckEvents {
  export const StateReady: ActivationEvent.ActivationEvent = Events.createStateEvent(`${meta.id}/state-ready`);
}
