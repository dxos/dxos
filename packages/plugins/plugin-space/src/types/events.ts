//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '#meta';

export namespace SpaceEvents {
  /** @deprecated Ordering-only; declare `requires: [SpaceCapabilities.State]` instead. */
  export const StateReady = AppActivationEvents.createStateEvent(`${meta.profile.key}.event.state-ready`);
  /** @deprecated Ordering-only; no remaining listeners. */
  export const SetupSettingsPanel = ActivationEvent.make(`${meta.profile.key}.event.setupSettingsPanel`);
  /** @deprecated Ordering-only; declare `activatesOn: ClientEvents.IdentityCreated` instead. */
  export const PersonalSpaceReady = ActivationEvent.make(`${meta.profile.key}.event.defaultSpaceReady`);
  /** Runtime event: fired imperatively when a space is created. */
  export const SpaceCreated = ActivationEvent.make(`${meta.profile.key}.event.spaceCreated`);
  /** Runtime event: fired imperatively when a type is added to a space. */
  export const TypeAdded = ActivationEvent.make(`${meta.profile.key}.event.typeAdded`);
}
