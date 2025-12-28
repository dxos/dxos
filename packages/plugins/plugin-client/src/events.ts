//
// Copyright 2025 DXOS.org
//

import { ActivationEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace ClientEvents {
  export const ClientReady = ActivationEvent.make(`${meta.id}/event/client-ready`);
  export const SetupSchema = ActivationEvent.make(`${meta.id}/event/setup-schema`);
  export const SetupMigration = ActivationEvent.make(`${meta.id}/event/setup-migration`);
  export const IdentityCreated = ActivationEvent.make(`${meta.id}/event/identity-created`);
  export const SpacesReady = ActivationEvent.make(`${meta.id}/event/spaces-ready`);
}
