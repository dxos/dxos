//
// Copyright 2025 DXOS.org
//

import { Events, defineEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace SpaceEvents {
  export const StateReady = Events.createStateEvent(`${meta.id}/event/state-ready`);
  export const SetupSettingsPanel = defineEvent(`${meta.id}/event/setup-settings-panel`);
  export const DefaultSpaceReady = defineEvent(`${meta.id}/event/default-space-ready`);
  export const SpaceCreated = defineEvent(`${meta.id}/event/space-created`);
  export const SchemaAdded = defineEvent(`${meta.id}/event/schema-added`);
}
