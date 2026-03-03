//
// Copyright 2025 DXOS.org
//

import { type ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { SimpleLayoutState } from './capabilities';

export namespace SimpleLayoutEvents {
  /** Fired when SimpleLayoutState capability is ready. */
  export const StateReady: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(
    SimpleLayoutState.identifier,
  );
}
