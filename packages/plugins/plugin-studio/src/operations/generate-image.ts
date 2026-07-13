//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';

import { Capability } from '@dxos/app-framework';
import { Credential, Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { Image, ImageArtifactOperation, ImageGeneration, StudioCapabilities } from '../types';

const handler: Operation.WithHandler<typeof ImageArtifactOperation.GenerateImage> =
  ImageArtifactOperation.GenerateImage.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ artifact, provider, count }) {
        const services = yield* Capability.getAll(StudioCapabilities.ImageGenerationService);
        const service = provider ? services.find((candidate) => candidate.id === provider) : services[0];
        if (!service) {
          return yield* Effect.fail(new ImageGeneration.NoImageGenerationServiceError(provider));
        }

        const artifactObj = yield* Database.load(artifact);
        const instructions = yield* Database.load(artifactObj.instructions);
        const text = yield* Database.load(instructions.text);
        const prompt = text.content ?? '';

        // The API key is resolved from the Connector-managed AccessToken (keyed by the provider's
        // `source`); keyless providers (e.g. the test mock) leave `source` undefined.
        let apiKey: Redacted.Redacted<string> | undefined;
        if (service.source) {
          const credential = yield* Credential.CredentialsService.getCredential({ service: service.source });
          if (!credential.apiKey) {
            return yield* Effect.fail(new ImageGeneration.MissingCredentialError(service.source));
          }
          apiKey = Redacted.make(credential.apiKey);
        }

        // `tryPromise` routes a provider rejection to the operation's failure channel, preserving the
        // original Error so callers can match by name.
        const result = yield* Effect.tryPromise({
          try: () => service.generate({ prompt, count: count ?? 1 }, { apiKey }),
          catch: (error) => (error instanceof Error ? error : new ImageGeneration.GenerationError(String(error))),
        });

        for (const data of result.images) {
          const image = Image.make({
            url: data.url,
            prompt: data.prompt,
            model: data.model,
            resolution: data.resolution,
            seed: data.seed,
            styleType: data.styleType,
            isImageSafe: data.isImageSafe,
            metadata: data.metadata,
          });
          // Owned by the artifact: cascade-deletes and deep-clones with it.
          Obj.setParent(image, artifactObj);
          yield* Database.add(image);
          Obj.update(artifactObj, (artifactObj) => {
            artifactObj.images = [...(artifactObj.images ?? []), Ref.make(image)];
          });
        }

        return { count: result.images.length };
      }),
    ),
    Operation.opaqueHandler,
  );

export default handler;
