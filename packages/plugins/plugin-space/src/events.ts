//
// Copyright 2025 DXOS.org
//

import { defineEvent, Events } from '@dxos/app-framework';

import { SPACE_PLUGIN } from './meta';

export namespace SpaceEvents {
  export const StateReady = Events.createStateEvent(`${SPACE_PLUGIN}/event/state-ready`);
  export const SetupSettingsPanel = defineEvent(`${SPACE_PLUGIN}/event/setup-settings-panel`);
  export const DefaultSpaceReady = defineEvent(`${SPACE_PLUGIN}/event/default-space-ready`);
}

// TODO(wittjosiah): Factor out.
export namespace ThreadEvents {
  export const SetupThread = defineEvent(`${SPACE_PLUGIN}/event/setup-thread`);
}
