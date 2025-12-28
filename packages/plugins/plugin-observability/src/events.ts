//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Events } from '@dxos/app-framework';

import { meta } from './meta';

export namespace ObservabilityEvents {
  export const StateReady: ActivationEvent.ActivationEvent = Events.createStateEvent(meta.id);
}

// NOTE: This is cloned from the client plugin to avoid circular dependencies.
export const ClientReadyEvent = ActivationEvent.make('dxos.org/plugin/client/event/client-ready');
