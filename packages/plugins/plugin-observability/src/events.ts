//
// Copyright 2025 DXOS.org
//

import { Events, defineEvent } from '@dxos/app-framework';

import { OBSERVABILITY_PLUGIN } from './meta';

export namespace ObservabilityEvents {
  export const StateReady = Events.createStateEvent(OBSERVABILITY_PLUGIN);
}

// NOTE: This is cloned from the client plugin to avoid circular dependencies.
export const ClientReadyEvent = defineEvent('dxos.org/plugin/client/event/client-ready');
