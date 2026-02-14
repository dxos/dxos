//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '../meta';

export namespace ObservabilityEvents {
  export const StateReady: ActivationEvent.ActivationEvent = AppActivationEvents.createStateEvent(meta.id);
}

// NOTE: This is cloned from the client plugin to avoid circular dependencies.
export const ClientReadyEvent = ActivationEvent.make('dxos.org/plugin/client/event/client-ready');
