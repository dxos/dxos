//
// Copyright 2025 DXOS.org
//

import { Events, defineEvent } from '@dxos/app-framework';

import { SPACE_PLUGIN } from './meta';

export namespace SpaceEvents {
  export const StateReady = Events.createStateEvent(`${SPACE_PLUGIN}/event/state-ready`);
  export const SetupSettingsPanel = defineEvent(`${SPACE_PLUGIN}/event/setup-settings-panel`);
  export const DefaultSpaceReady = defineEvent(`${SPACE_PLUGIN}/event/default-space-ready`);
  export const SpaceCreated = defineEvent(`${SPACE_PLUGIN}/event/space-created`);
  export const SchemaAdded = defineEvent(`${SPACE_PLUGIN}/event/schema-added`);
}
