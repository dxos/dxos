//
// Copyright 2025 DXOS.org
//

import { type ActivationEvent, Common } from '@dxos/app-framework';

import { meta } from './meta';

export namespace DeckEvents {
  export const StateReady: ActivationEvent.ActivationEvent = Common.ActivationEvent.createStateEvent(
    `${meta.id}/state-ready`,
  );
}
