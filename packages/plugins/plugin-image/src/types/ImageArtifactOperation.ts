//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Credential, Operation } from '@dxos/compute';
import { Database, DXN, Ref } from '@dxos/echo';

import { meta } from '#meta';

import * as ImageArtifact from './ImageArtifact';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Generate images for an ImageArtifact from its prompt and append them. Resolves the
 * `ImageGenerationService` (by `provider`, else the first registered), resolves the provider's API
 * key from the Connector-managed `AccessToken` via `CredentialsService` when `service.source` is set,
 * and appends a `Image` per result to `artifact.images`.
 */
export const GenerateImage = Operation.make({
  meta: {
    key: makeKey('generateImage'),
    name: 'Generate Image',
    description: 'Generate images for an ImageArtifact from its prompt.',
    icon: 'ph--sparkle--regular',
  },
  input: Schema.Struct({
    artifact: Ref.Ref(ImageArtifact.ImageArtifact).annotations({
      description: 'Reference to the ImageArtifact whose prompt drives generation.',
    }),
    provider: Schema.optional(
      Schema.String.annotations({ description: 'ImageGenerationService id; defaults to the first registered.' }),
    ),
    count: Schema.optional(Schema.Number.annotations({ description: 'Number of images to generate (default 1).' })),
  }),
  output: Schema.Struct({
    count: Schema.Number.annotations({ description: 'Number of images appended.' }),
  }),
  services: [Database.Service, Capability.Service, Credential.CredentialsService],
});
