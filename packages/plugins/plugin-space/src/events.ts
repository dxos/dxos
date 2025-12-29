//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, Common } from '@dxos/app-framework';

import { meta } from './meta';

export namespace SpaceEvents {
  export const StateReady = Common.ActivationEvent.createStateEvent(`${meta.id}/event/state-ready`);
  export const SetupSettingsPanel = ActivationEvent.make(`${meta.id}/event/setup-settings-panel`);
  export const DefaultSpaceReady = ActivationEvent.make(`${meta.id}/event/default-space-ready`);
  export const SpaceCreated = ActivationEvent.make(`${meta.id}/event/space-created`);
  export const SchemaAdded = ActivationEvent.make(`${meta.id}/event/schema-added`);
}
