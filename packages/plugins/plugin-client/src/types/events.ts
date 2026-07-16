//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from '#meta';

export namespace ClientEvents {
  /** @deprecated Declare `requires: [ClientCapabilities.Client]` instead. */
  export const ClientReady = ActivationEvent.make(`${meta.profile.key}.event.clientReady`);
  /** @deprecated Contribute `ClientCapabilities.Schema` from a dependency-mode module instead. */
  export const SetupSchema = ActivationEvent.make(`${meta.profile.key}.event.setupSchema`);
  /** @deprecated Contribute `ClientCapabilities.Migration` from a dependency-mode module instead. */
  export const SetupMigration = ActivationEvent.make(`${meta.profile.key}.event.setupMigration`);
  export const IdentityCreated = ActivationEvent.make(`${meta.profile.key}.event.identityCreated`);
  export const SpacesReady = ActivationEvent.make(`${meta.profile.key}.event.spacesReady`);
}
