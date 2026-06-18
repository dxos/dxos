//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '#meta';

export namespace SpaceEvents {
  export const StateReady = AppActivationEvents.createStateEvent(`${meta.profile.key}.event.state-ready`);
  export const SetupSettingsPanel = ActivationEvent.make(`${meta.profile.key}.event.setupSettingsPanel`);
  export const PersonalSpaceReady = ActivationEvent.make(`${meta.profile.key}.event.defaultSpaceReady`);
  export const SpaceCreated = ActivationEvent.make(`${meta.profile.key}.event.spaceCreated`);
  export const TypeAdded = ActivationEvent.make(`${meta.profile.key}.event.typeAdded`);
}
