//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';

import { Capability } from '@dxos/app-framework';
import { Credential, Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { GenerationService, StudioCapabilities, StudioOperation, Variant } from '../types';

const handler: Operation.WithHandler<typeof StudioOperation.Generate> = StudioOperation.Generate.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ artifact, provider, count }) {
      const artifactObj = yield* Database.load(artifact);

      // Resolve the provider by the artifact's kind, then by explicit id, else the first for the kind.
      const services = yield* Capability.getAll(StudioCapabilities.GenerationService);
      const forKind = services.filter((candidate) => candidate.kind === artifactObj.kind);
      const service = provider ? forKind.find((candidate) => candidate.id === provider) : forKind[0];
      if (!service) {
        return yield* Effect.fail(new GenerationService.NoGenerationServiceError({ kind: artifactObj.kind, provider }));
      }

      const instructions = yield* Database.load(artifactObj.instructions);
      const text = yield* Database.load(instructions.text);
      const prompt = text.content ?? '';

      // The API key is resolved from the Connector-managed AccessToken (keyed by the provider's
      // `source`); keyless providers (e.g. the test mock) leave `source` undefined.
      let apiKey: Redacted.Redacted<string> | undefined;
      if (service.source) {
        const credential = yield* Credential.CredentialsService.getCredential({ service: service.source });
        if (!credential.apiKey) {
          return yield* Effect.fail(new GenerationService.MissingCredentialError(service.source));
        }
        apiKey = Redacted.make(credential.apiKey);
      }

      // The request is the prompt merged with the artifact's kind-specific config; the provider
      // validates it against its own requestSchema.
      const request: GenerationService.GenerationRequest = {
        ...(artifactObj.config ?? {}),
        prompt,
        ...(count !== undefined ? { count } : {}),
      };

      // `tryPromise` routes a provider rejection to the operation's failure channel, preserving the
      // original Error so callers can match by name.
      const result = yield* Effect.tryPromise({
        try: () => service.generate(request, { apiKey }),
        catch: (error) => (error instanceof Error ? error : new GenerationService.GenerationError(String(error))),
      });

      for (const data of result.variants) {
        const variant = Variant.make({
          contentType: data.contentType ?? service.contentType,
          url: data.url,
          generation: data.generation,
        });
        // Owned by the artifact: cascade-deletes and deep-clones with it.
        Obj.setParent(variant, artifactObj);
        yield* Database.add(variant);
        Obj.update(artifactObj, (artifactObj) => {
          artifactObj.variants = [...(artifactObj.variants ?? []), Ref.make(variant)];
          // Seed the cover with the first produced variant.
          if (!artifactObj.cover) {
            artifactObj.cover = Ref.make(variant);
          }
        });
      }

      return { count: result.variants.length };
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
