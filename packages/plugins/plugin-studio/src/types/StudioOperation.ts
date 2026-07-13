//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Credential, Operation } from '@dxos/compute';
import { Database, DXN, Ref } from '@dxos/echo';

import { meta } from '#meta';

import * as Artifact from './Artifact';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Generate variants for an Artifact from its prompt and append them. Resolves the
 * `GenerationService` (by `artifact.kind`, then `provider` id, else the first for the kind),
 * resolves the provider's API key from the Connector-managed `AccessToken` via `CredentialsService`
 * when `service.source` is set, builds the request from the prompt (`instructions.text`) plus
 * `artifact.config`, and appends a `Variant` per result (recording `Generation`).
 */
export const Generate = Operation.make({
  meta: {
    key: makeKey('generate'),
    name: 'Generate',
    description: 'Generate variants for an Artifact from its prompt.',
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    artifact: Ref.Ref(Artifact.Artifact).annotations({
      description: 'Reference to the Artifact whose prompt drives generation.',
    }),
    provider: Schema.optional(
      Schema.String.annotations({ description: 'GenerationService id; defaults to the first for the kind.' }),
    ),
    count: Schema.optional(Schema.Number.annotations({ description: 'Number of variants to generate (default 1).' })),
  }),
  output: Schema.Struct({
    count: Schema.Number.annotations({ description: 'Number of variants appended.' }),
  }),
  services: [Database.Service, Capability.Service, Credential.CredentialsService],
});
