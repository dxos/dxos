//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from '#meta';

export namespace ClientEvents {
  export const IdentityCreated = ActivationEvent.make(`${meta.profile.key}.event.identityCreated`);
  export const SpacesReady = ActivationEvent.make(`${meta.profile.key}.event.spacesReady`);
}
