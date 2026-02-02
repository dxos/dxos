//
// Copyright 2025 DXOS.org
//

import { type ActivationEvent, Common } from '@dxos/app-framework';

import { SimpleLayoutState } from './capabilities';

export namespace SimpleLayoutEvents {
  /** Fired when SimpleLayoutState capability is ready. */
  export const StateReady: ActivationEvent.ActivationEvent = Common.ActivationEvent.createStateEvent(
    SimpleLayoutState.identifier,
  );
}
