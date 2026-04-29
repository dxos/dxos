//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Database, Obj, Ref } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { AccessToken } from '@dxos/types';

import { meta } from '#meta';

import { Integration } from '../types';

const INTEGRATION_OPERATION = `${meta.id}.operation`;

export const AccessTokenCreated = Operation.make({
  meta: { key: `${INTEGRATION_OPERATION}.access-token-created`, name: 'Access Token Created' },
  input: Schema.Struct({ accessToken: AccessToken.AccessToken }),
  output: Schema.Void,
  // Some consumers (e.g. plugin-trello) auto-create an Integration when an OAuth
  // token is added. Declaring Database.Service here makes that available without
  // forcing handlers that don't need it to provide their own layer.
  services: [Database.Service],
});

/**
 * Generic create operation: produces an empty Integration bound to the given AccessToken.
 *
 * Service plugins typically wrap this inside their own connect flow, but the
 * generic create exists for "set up the integration first, attach targets later".
 */
export const CreateIntegration = Operation.make({
  meta: {
    key: `${INTEGRATION_OPERATION}.create-integration`,
    name: 'Create Integration',
    description: 'Creates a new Integration bound to an existing AccessToken.',
  },
  input: Schema.Struct({
    accessToken: Ref.Ref(AccessToken.AccessToken).annotations({
      description: 'The access token this Integration uses to authenticate to its service.',
    }),
    name: Schema.String.annotations({
      description: 'Optional user-friendly label.',
    }).pipe(Schema.optional),
  }),
  output: Integration.Integration,
  services: [Database.Service],
});

/**
 * Generic, service-agnostic selection diff. Mechanically reconciles
 * `integration.targets` to match `selectedRefs`: appends entries for refs not
 * already present (preserving any cursor/status on existing ones) and removes
 * entries whose ref isn't in the new selection. Does not create or delete
 * underlying objects (those are owned by the provider's `getSyncTargets`).
 */
export const SetIntegrationTargets = Operation.make({
  meta: {
    key: `${INTEGRATION_OPERATION}.set-integration-targets`,
    name: 'Set Integration Targets',
    description: "Reconciles an Integration's targets to match the chosen selection.",
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
    selectedRefs: Schema.Array(Ref.Ref(Obj.Unknown)),
  }),
  output: Schema.Struct({
    added: Schema.Number,
    removed: Schema.Number,
  }),
  services: [Database.Service],
});
