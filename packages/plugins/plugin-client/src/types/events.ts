//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from '#meta';

export namespace ClientEvents {
  export const ClientReady = ActivationEvent.make(`${meta.id}.event.clientReady`);
  export const SetupSchema = ActivationEvent.make(`${meta.id}.event.setupSchema`);
  export const SetupMigration = ActivationEvent.make(`${meta.id}.event.setupMigration`);
  export const IdentityCreated = ActivationEvent.make(`${meta.id}.event.identityCreated`);
  export const SpacesReady = ActivationEvent.make(`${meta.id}.event.spacesReady`);
}
