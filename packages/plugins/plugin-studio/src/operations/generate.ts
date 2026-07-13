//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Credential, Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';

import { meta } from '#meta';

import { GenerationService, StudioCapabilities, StudioOperation, Variant } from '../types';

/** Route a provider rejection to the failure channel, preserving the original Error for name matching. */
const toError = (error: unknown): Error =>
  error instanceof Error ? error : new GenerationService.GenerationError(String(error));

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

      // Publish a progress monitor when the app registry is present (absent in headless tests); the
      // provider drives it via `onProgress`, and the meter's cancel aborts the in-flight request.
      const registry = (yield* Capability.getAll(AppCapabilities.ProgressRegistry))[0];
      const controller = new AbortController();
      const monitor = registry?.register(`${meta.profile.key}/${artifactObj.id}`, {
        label: `Generating ${artifactObj.kind}…`,
        onCancel: () => controller.abort(),
      });
      const options: GenerationService.GenerateOptions = {
        apiKey,
        signal: controller.signal,
        onProgress: ({ current, total }) => {
          if (total !== undefined) {
            monitor?.total(total);
          }
          if (current !== undefined) {
            monitor?.set(current);
          }
        },
      };

      // Synchronous providers implement `generate`; asynchronous ones implement `enqueue` +
      // `awaitResult` and persist the job id on the artifact so a long poll resumes across remount.
      const run = Effect.gen(function* () {
        if (service.enqueue && service.awaitResult) {
          let jobId = artifactObj.jobId;
          if (!jobId) {
            const enqueued = yield* Effect.tryPromise({
              try: () => service.enqueue!(request, options),
              catch: toError,
            });
            jobId = enqueued.jobId;
            Obj.update(artifactObj, (artifactObj) => {
              artifactObj.jobId = jobId;
            });
          }
          const awaited = yield* Effect.tryPromise({ try: () => service.awaitResult!(jobId, options), catch: toError });
          Obj.update(artifactObj, (artifactObj) => {
            artifactObj.jobId = undefined;
          });
          return awaited;
        }
        if (service.generate) {
          return yield* Effect.tryPromise({ try: () => service.generate!(request, options), catch: toError });
        }
        return yield* Effect.fail(
          new GenerationService.GenerationError(`Provider ${service.id} implements neither generate nor enqueue.`),
        );
      });

      const result = yield* run.pipe(Effect.ensuring(Effect.sync(() => monitor?.remove())));

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
