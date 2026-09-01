//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';

import * as Artifact from './Artifact.ts';
import * as Variant from './Variant.ts';

/**
 * Generate variants for an Artifact from its prompt and append them. Resolves the
 * `GenerationService` (by `artifact.kind`, then `provider` id, else the first for the kind),
 * resolves the provider's API key from the Connector-managed `AccessToken` via `CredentialsService`
 * when `service.source` is set, builds the request from the supplied `config` (which includes the
 * prompt), and appends a `Variant` per result (each recording its `config` + `Generation`).
 * For an asynchronous provider the pending `Variant` holds the in-flight `jobId`; pass `variant` to
 * resume awaiting it (no re-enqueue).
 */
export const Generate = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.studio.generate'),
    name: 'Generate',
    description: 'Generate variants for an Artifact from its prompt.',
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    artifact: Ref.Ref(Artifact.Artifact).annotate({
      description: 'Reference to the Artifact whose prompt drives generation.',
    }),
    provider: Schema.optional(
      Schema.String.annotate({ description: 'GenerationService id; defaults to the first for the kind.' }),
    ),
    name: Schema.optional(
      Schema.String.annotate({ description: 'Human label for the produced variant (defaults from the prompt).' }),
    ),
    config: Schema.optional(
      Schema.Record(Schema.String, Schema.Unknown).annotate({
        description: 'Kind-specific request config (recorded on the produced variant).',
      }),
    ),
    variant: Schema.optional(
      Ref.Ref(Variant.Variant).annotate({
        description: 'Pending variant to resume (awaits its in-flight jobId; no re-enqueue).',
      }),
    ),
    count: Schema.optional(Schema.Number.annotate({ description: 'Number of variants to generate (default 1).' })),
  }),
  output: Schema.Struct({
    count: Schema.Number.annotate({ description: 'Number of variants appended.' }),
  }),
  services: [Database.Service, Capability.Service, Credential.CredentialsService],
});
