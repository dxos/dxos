//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Capability, CapabilityManager } from '@dxos/app-framework';
import { Instructions } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { configuredCredentialsLayer } from '@dxos/functions';
import { Text } from '@dxos/schema';

import { Artifact, type GenerationService, StudioCapabilities, Variant } from '../types';
import generateHandler from './generate';

const IDEOGRAM_SOURCE = 'ideogram.ai';

/** A minimal request schema shared by the mocks. */
const RequestSchema = Schema.Struct({ style: Schema.optional(Schema.String) });

/** A mock provider (kind 'image') that records the request/apiKey it was called with. */
const mockService = (
  variants: readonly GenerationService.VariantData[],
  options: {
    kind?: string;
    id?: string;
    source?: string;
    calls?: { request: GenerationService.GenerationRequest; apiKey?: string }[];
  } = {},
): GenerationService.GenerationService => ({
  kind: options.kind ?? 'image',
  id: options.id ?? 'mock',
  label: 'Mock',
  contentType: 'image/png',
  source: options.source,
  requestSchema: RequestSchema,
  generate: async (request, { apiKey }) => {
    options.calls?.push({ request, apiKey: apiKey ? Redacted.value(apiKey) : undefined });
    return { variants: [...variants] };
  },
});

const capabilityService = (...services: GenerationService.GenerationService[]) => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  for (const service of services) {
    manager.contribute({
      interface: StudioCapabilities.GenerationService,
      implementation: service,
      module: service.id,
    });
  }
  return manager;
};

describe('generate', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({
      types: [Artifact.Artifact, Variant.Variant, Instructions.Instructions, Text.Text],
    }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const addArtifact = (prompt: string, kind = 'image'): Artifact.Artifact => db.add(Artifact.make({ kind, prompt }));

  const run = (
    artifact: Artifact.Artifact,
    {
      services = [],
      creds = [],
      provider,
    }: {
      services?: GenerationService.GenerationService[];
      creds?: { service: string; apiKey: string }[];
      provider?: string;
    } = {},
  ) =>
    generateHandler.handler({ artifact: Ref.make(artifact), provider }).pipe(
      Effect.provideService(Capability.Service, capabilityService(...services)),
      Effect.provide(Database.layer(db)),
      Effect.provide(configuredCredentialsLayer(creds)),
      // opaqueHandler erases the context; the layers above satisfy it at runtime.
      (effect) => effect as Effect.Effect<{ count: number }, unknown, never>,
      EffectEx.runPromise,
    );

  test('appends a Variant per result (keyless mock), seeding cover + generation', async ({ expect }) => {
    const artifact = addArtifact('A serene mountain lake at dawn.');
    await db.flush();

    const result = await run(artifact, {
      services: [
        mockService([
          { url: 'https://example.com/a.png', generation: { provider: 'mock', seed: 1 } },
          { url: 'https://example.com/b.png', generation: { provider: 'mock', seed: 2 } },
        ]),
      ],
    });
    expect(result.count).toBe(2);

    await db.flush();
    const variants = artifact.variants ?? [];
    expect(variants).toHaveLength(2);
    const loaded = await Promise.all(variants.map((ref) => ref.load()));
    expect(loaded.map((variant) => variant.url)).toEqual(['https://example.com/a.png', 'https://example.com/b.png']);
    // Default contentType comes from the provider; generation provenance is recorded.
    expect(loaded[0].contentType).toBe('image/png');
    expect(loaded[0].generation?.seed).toBe(1);
    // Cover is seeded with the first produced variant.
    expect(artifact.cover?.target?.id).toBe(loaded[0].id);
  });

  test('resolves the provider by kind and passes the prompt in the request', async ({ expect }) => {
    const artifact = addArtifact('A neon city.', 'video');
    await db.flush();

    const calls: { request: GenerationService.GenerationRequest; apiKey?: string }[] = [];
    const result = await run(artifact, {
      services: [
        mockService([], { kind: 'image', id: 'image-mock' }),
        mockService([{ url: 'https://example.com/v.mp4' }], { kind: 'video', id: 'video-mock', calls }),
      ],
    });
    expect(result.count).toBe(1);
    expect(calls).toHaveLength(1);
    expect(calls[0].request.prompt).toBe('A neon city.');
  });

  test('resolves the provider API key from the Connector-managed credential', async ({ expect }) => {
    const artifact = addArtifact('A neon city.');
    await db.flush();

    const calls: { request: GenerationService.GenerationRequest; apiKey?: string }[] = [];
    const result = await run(artifact, {
      services: [mockService([{ url: 'https://example.com/c.png' }], { source: IDEOGRAM_SOURCE, calls })],
      creds: [{ service: IDEOGRAM_SOURCE, apiKey: 'sk-test' }],
    });
    expect(result.count).toBe(1);
    expect(calls.map((call) => call.apiKey)).toEqual(['sk-test']);
  });

  test('fails when no generation service is registered for the kind', async ({ expect }) => {
    const artifact = addArtifact('Anything.');
    await db.flush();
    await expect(run(artifact, { services: [mockService([], { kind: 'video' })] })).rejects.toThrow(
      /No generation service/,
    );
  });
});
