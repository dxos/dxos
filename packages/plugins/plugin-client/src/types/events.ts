//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';

import { meta } from '#meta';

export namespace ClientEvents {
  /**
   * Runtime event: `client.initialize()` (forked off the startup pass) has completed. Modules
   * whose activation bodies need an initialized client (sync `halo`/`spaces` reads) ride this
   * instead of the startup dependency pass, which no longer implies initialization.
   */
  export const Initialized = ActivationEvent.make(`${meta.profile.key}.event.initialized`);
  export const IdentityCreated = ActivationEvent.make(`${meta.profile.key}.event.identityCreated`);
  export const SpacesReady = ActivationEvent.make(`${meta.profile.key}.event.spacesReady`);
}
