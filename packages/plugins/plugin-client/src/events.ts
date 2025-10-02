//
// Copyright 2025 DXOS.org
//

import { defineEvent } from '@dxos/app-framework';

import { meta } from './meta';

export namespace ClientEvents {
  export const ClientReady = defineEvent(`${meta.id}/event/client-ready`);
  export const SetupSchema = defineEvent(`${meta.id}/event/setup-schema`);
  export const SetupMigration = defineEvent(`${meta.id}/event/setup-migration`);
  export const IdentityCreated = defineEvent(`${meta.id}/event/identity-created`);
  export const SpacesReady = defineEvent(`${meta.id}/event/spaces-ready`);
}
