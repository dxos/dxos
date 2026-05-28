//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Operation } from '@dxos/compute';
import { Obj, Ref, Type, DXN } from '@dxos/echo';
import { AccessToken } from '@dxos/types';

import { meta } from '#meta';

import * as Integration from './Integration';

const makeKey = (name: string) => DXN.make(`${DXN.getName(meta.id)}.operation.${name}`);

/**
 * Generic create operation: produces an empty Integration bound to the given AccessToken.
 */
export const CreateIntegration = Operation.make({
  meta: {
    key: makeKey('createIntegration'),
    name: 'Create Integration',
    description: 'Creates a new Integration bound to an existing AccessToken.',
    icon: 'ph--plugs-connected--regular',
  },
  input: Schema.Struct({
    accessToken: Ref.Ref(AccessToken.AccessToken).annotations({
      description: 'The access token this Integration uses to authenticate to its service.',
    }),
    name: Schema.String.annotations({
      description: 'Optional user-friendly label.',
    }).pipe(Schema.optional),
  }),
  output: Type.getSchema(Integration.Integration),
});

/**
 * Generic, service-agnostic selection diff.
 */
export const SetIntegrationTargets = Operation.make({
  meta: {
    key: makeKey('setIntegrationTargets'),
    name: 'Set Integration Targets',
    description: "Reconciles an Integration's targets to match the chosen selection.",
    icon: 'ph--sliders--regular',
  },
  input: Schema.Struct({
    integration: Ref.Ref(Integration.Integration),
    selected: Schema.Array(
      Schema.Struct({
        /** Foreign id from the remote service. */
        remoteId: Schema.String,
        /** Cached display name. */
        name: Schema.String.pipe(Schema.optional),
      }),
    ),
    existingTarget: Ref.Ref(Obj.Unknown).pipe(Schema.optional),
  }),
  output: Schema.Struct({
    added: Schema.Number,
    removed: Schema.Number,
  }),
});
