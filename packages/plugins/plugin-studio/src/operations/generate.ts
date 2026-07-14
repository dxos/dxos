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

import { Generation, GenerationService, StudioCapabilities, StudioOperation, Variant } from '../types';

/** Route a provider rejection to the failure channel, preserving the original Error for name matching. */
const toError = (error: unknown): Error =>
  error instanceof Error ? error : new GenerationService.GenerationError(String(error));

const handler: Operation.WithHandler<typeof StudioOperation.Generate> = StudioOperation.Generate.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({
      artifact,
      provider,
      name: inputName,
      config: inputConfig,
      variant: variantRef,
      count,
    }) {
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

      // Resuming an async job reuses the pending variant's stored config/name; otherwise the draft.
      const resumeVariant = variantRef ? yield* Database.load(variantRef) : undefined;
      const config = resumeVariant?.config ?? inputConfig;
      // Variant label: the supplied name, else a short prefix of the prompt.
      const name = resumeVariant?.name ?? inputName ?? (prompt ? prompt.slice(0, 80) : undefined);

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

      // The request is the prompt merged with the kind-specific config; the provider validates it
      // against its own requestSchema.
      const request: GenerationService.GenerationRequest = {
        ...(config ?? {}),
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

      // Record provenance so each variant carries the prompt + params that produced it, falling back
      // to the request prompt when the provider does not echo it.
      const makeGeneration = (data: GenerationService.VariantData): Generation.Generation => ({
        provider: service.id,
        ...data.generation,
        prompt: data.generation?.prompt ?? prompt,
      });

      // Append a produced (frozen) variant owned by the artifact; seed the cover with the first.
      const appendVariant = (data: GenerationService.VariantData) =>
        Effect.gen(function* () {
          const created = Variant.make({
            name,
            contentType: data.contentType ?? service.contentType,
            url: data.url,
            config,
            generation: makeGeneration(data),
          });
          Obj.setParent(created, artifactObj);
          yield* Database.add(created);
          Obj.update(artifactObj, (artifactObj) => {
            artifactObj.variants = [...(artifactObj.variants ?? []), Ref.make(created)];
            if (!artifactObj.cover) {
              artifactObj.cover = Ref.make(created);
            }
          });
        });

      // Synchronous providers implement `generate`; asynchronous ones implement `enqueue` +
      // `awaitResult`. For async a pending Variant holds the in-flight jobId (persisted so a long
      // poll resumes across remount), then is filled in on completion. (Locals narrow the optional
      // methods so no non-null assertion is needed.)
      const { enqueue, awaitResult, generate } = service;
      const run = Effect.gen(function* () {
        if (enqueue && awaitResult) {
          let pending = resumeVariant;
          let jobId = pending?.jobId;
          if (!jobId) {
            const enqueued = yield* Effect.tryPromise({ try: () => enqueue(request, options), catch: toError });
            jobId = enqueued.jobId;
            const created = Variant.make({ name, config, jobId });
            Obj.setParent(created, artifactObj);
            yield* Database.add(created);
            Obj.update(artifactObj, (artifactObj) => {
              artifactObj.variants = [...(artifactObj.variants ?? []), Ref.make(created)];
            });
            pending = created;
          }
          if (!pending || jobId === undefined) {
            return yield* Effect.fail(new GenerationService.GenerationError('Failed to enqueue generation job.'));
          }
          const pendingVariant = pending;
          const pendingJobId = jobId;
          // Clear the jobId on failure/abort — otherwise the article's resume effect would re-invoke
          // this op in a loop (or silently restart a poll the user just cancelled).
          const awaited = yield* Effect.tryPromise({
            try: () => awaitResult(pendingJobId, options),
            catch: (error) => {
              Obj.update(pendingVariant, (pendingVariant) => {
                pendingVariant.jobId = undefined;
              });
              return toError(error);
            },
          });
          // Fill the pending variant with the first result (freezing it); append any extras.
          const [first, ...rest] = awaited.variants;
          if (first) {
            Obj.update(pendingVariant, (pendingVariant) => {
              pendingVariant.contentType = first.contentType ?? service.contentType;
              pendingVariant.url = first.url;
              pendingVariant.generation = makeGeneration(first);
              pendingVariant.jobId = undefined;
            });
            Obj.update(artifactObj, (artifactObj) => {
              if (!artifactObj.cover) {
                artifactObj.cover = Ref.make(pendingVariant);
              }
            });
          } else {
            Obj.update(pendingVariant, (pendingVariant) => {
              pendingVariant.jobId = undefined;
            });
          }
          for (const data of rest) {
            yield* appendVariant(data);
          }
          return { count: awaited.variants.length };
        }
        if (generate) {
          const result = yield* Effect.tryPromise({ try: () => generate(request, options), catch: toError });
          for (const data of result.variants) {
            yield* appendVariant(data);
          }
          return { count: result.variants.length };
        }
        return yield* Effect.fail(
          new GenerationService.GenerationError(`Provider ${service.id} implements neither generate nor enqueue.`),
        );
      });

      return yield* run.pipe(Effect.ensuring(Effect.sync(() => monitor?.remove())));
    }),
  ),
  Operation.opaqueHandler,
);

export default handler;
