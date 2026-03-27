//
// Copyright 2025 DXOS.org
//

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { SpotlightState } from './capabilities';

export namespace SpotlightEvents {
  /** Fired when SpotlightState capability is ready. */
  export const StateReady: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(
    SpotlightState.identifier,
  );
}
