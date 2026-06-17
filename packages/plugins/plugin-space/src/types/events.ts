//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '#meta';

export namespace SpaceEvents {
  export const StateReady = AppActivationEvents.createStateEvent(`${meta.id}.event.stateReady`);
  export const SetupSettingsPanel = ActivationEvent.make(`${meta.id}.event.setupSettingsPanel`);
  export const PersonalSpaceReady = ActivationEvent.make(`${meta.id}.event.defaultSpaceReady`);
  export const SpaceCreated = ActivationEvent.make(`${meta.id}.event.spaceCreated`);
  export const TypeAdded = ActivationEvent.make(`${meta.id}.event.typeAdded`);
}
