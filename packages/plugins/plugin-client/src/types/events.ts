//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { meta } from '#meta';

export namespace ClientEvents {
  export const IdentityCreated = ActivationEvent.make(`${meta.profile.key}.event.identityCreated`);
  export const SpacesReady = ActivationEvent.make(`${meta.profile.key}.event.spacesReady`);
}
