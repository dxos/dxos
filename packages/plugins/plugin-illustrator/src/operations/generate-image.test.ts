//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Redacted from 'effect/Redacted';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Capability, CapabilityManager } from '@dxos/app-framework';
import { Instructions } from '@dxos/compute';
import { Database, Ref } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { configuredCredentialsLayer } from '@dxos/functions';
import { Text } from '@dxos/schema';

import { IllustratorCapabilities, Image, ImageArtifact, type ImageGeneration } from '../types';
import generateImageHandler from './generate-image';

const IDEOGRAM_SOURCE = 'ideogram.ai';

/** A keyless mock provider that records the request/apiKey it was called with. */
const mockService = (
  images: readonly ImageGeneration.GeneratedImageData[],
  options: { source?: string; calls?: { apiKey?: string }[] } = {},
): ImageGeneration.ImageGenerationService => ({
  id: 'mock',
  label: 'Mock',
  source: options.source,
  generate: async (_request, { apiKey }) => {
    options.calls?.push({ apiKey: apiKey ? Redacted.value(apiKey) : undefined });
    return { images: [...images] };
  },
});

const capabilityService = (service?: ImageGeneration.ImageGenerationService) => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  if (service) {
    manager.contribute({
      interface: IllustratorCapabilities.ImageGenerationService,
      implementation: service,
      module: service.id,
    });
  }
  return manager;
};

describe('generateImage', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({
      types: [ImageArtifact.ImageArtifact, Image.Image, Instructions.Instructions, Text.Text],
    }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const addArtifact = (prompt: string): ImageArtifact.ImageArtifact => db.add(ImageArtifact.make({ prompt }));

  const run = (
    artifact: ImageArtifact.ImageArtifact,
    {
      service,
      creds = [],
    }: { service?: ImageGeneration.ImageGenerationService; creds?: { service: string; apiKey: string }[] } = {},
  ) =>
    generateImageHandler.handler({ artifact: Ref.make(artifact) }).pipe(
      Effect.provideService(Capability.Service, capabilityService(service)),
      Effect.provide(Database.layer(db)),
      Effect.provide(configuredCredentialsLayer(creds)),
      // opaqueHandler erases the context to `any`; the layers above satisfy it at runtime.
      (effect) => effect as Effect.Effect<{ count: number }, any, never>,
      EffectEx.runPromise,
    );

  test('appends a Image per result (keyless mock)', async ({ expect }) => {
    const artifact = addArtifact('A serene mountain lake at dawn.');
    await db.flush();

    const result = await run(artifact, {
      service: mockService([
        { url: 'https://example.com/a.png', seed: 1, resolution: '1024x1024' },
        { url: 'https://example.com/b.png', seed: 2 },
      ]),
    });
    expect(result.count).toBe(2);

    await db.flush();
    const images = artifact.images ?? [];
    expect(images).toHaveLength(2);
    const loaded = await Promise.all(images.map((ref) => ref.load()));
    expect(loaded.map((image) => image.url)).toEqual(['https://example.com/a.png', 'https://example.com/b.png']);
    expect(loaded[0].seed).toBe(1);
    expect(loaded[0].resolution).toBe('1024x1024');
  });

  test('resolves the provider API key from the Connector-managed credential', async ({ expect }) => {
    const artifact = addArtifact('A neon city.');
    await db.flush();

    const calls: { apiKey?: string }[] = [];
    const result = await run(artifact, {
      service: mockService([{ url: 'https://example.com/c.png' }], { source: IDEOGRAM_SOURCE, calls }),
      creds: [{ service: IDEOGRAM_SOURCE, apiKey: 'sk-test' }],
    });
    expect(result.count).toBe(1);
    expect(calls).toEqual([{ apiKey: 'sk-test' }]);
  });

  test('fails when no image-generation service is registered', async ({ expect }) => {
    const artifact = addArtifact('Anything.');
    await db.flush();
    await expect(run(artifact)).rejects.toThrow(/No image-generation service/);
  });
});
