//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { Text } from '@dxos/schema';
import { TaskSet } from '@dxos/types';

import { Frame, type GenerationService, MediaArtifact, Storyboard, StudioCapabilities, Variant } from '#types';

import appendFrame from './append-frame.ts';
import createStoryboard from './create-storyboard.ts';
import listProviders from './list-providers.ts';

const mockVideoService: GenerationService.GenerationService = {
  kind: 'video',
  id: 'mock-video',
  label: 'Mock video',
  contentType: 'video/mp4',
  requestSchema: Schema.Struct({ prompt: Schema.String, model: Schema.optional(Schema.String) }),
  defaultRequest: { model: 'mock/v1' },
  generate: async () => ({ variants: [] }),
};

describe('storyboard operations', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({
      types: [
        Storyboard.Storyboard,
        Frame.Frame,
        MediaArtifact.MediaArtifact,
        Variant.Variant,
        Project.Project,
        Instructions.Instructions,
        Text.Text,
        TaskSet.TaskSet,
      ],
    }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const provide = <A>(effect: Effect.Effect<A, unknown, any>): Promise<A> =>
    effect.pipe(
      Effect.provide(Database.layer(db)),
      Effect.provideService(Capability.Service, capabilityService()),
      // opaqueHandler erases the context; the layers above satisfy it at runtime.
      (effect) => effect as Effect.Effect<A, unknown, never>,
      EffectEx.runPromise,
    );

  const capabilityService = () => {
    const manager = CapabilityManager.make({ registry: Registry.make() });
    manager.contribute({
      interface: StudioCapabilities.GenerationService,
      implementation: mockVideoService,
      module: 'mock',
    });
    return manager;
  };

  test('create-storyboard files the storyboard into the project', async ({ expect }) => {
    const project = db.add(Project.make({ name: 'Studio' }));
    await db.flush();

    const { storyboard: ref } = await provide(
      createStoryboard.handler({ name: 'How Studio works', project: Ref.make(project) }),
    );
    const storyboard = await db.query(Filter.type(Storyboard.Storyboard)).first();
    expect(ref.target?.id).toBe(storyboard.id);
    expect(storyboard.name).toBe('How Studio works');
    expect(project.artifacts.map((artifact) => artifact.target?.id)).toEqual([storyboard.id]);
  });

  test('append-frame makes a parented artifact and frame, in order, with the config to generate', async ({
    expect,
  }) => {
    const storyboard = db.add(Storyboard.make({ name: 'Board' }));
    await db.flush();

    const first = await provide(
      appendFrame.handler({
        storyboard: Ref.make(storyboard),
        name: 'Establishing shot',
        kind: 'video',
        prompt: 'A studio at dawn',
        provider: 'mock-video',
        config: { model: 'mock/v1' },
      }),
    );
    const second = await provide(
      appendFrame.handler({ storyboard: Ref.make(storyboard), name: 'Reveal', kind: 'video', prompt: 'The reveal' }),
    );

    expect(first.config).toEqual({ model: 'mock/v1', prompt: 'A studio at dawn' });
    const frames = await Promise.all(storyboard.frames.map((ref) => ref.load()));
    expect(frames.map((frame) => frame.name)).toEqual(['Establishing shot', 'Reveal']);
    const artifact = await frames[0].artifact?.load();
    expect(artifact?.id).toBe(first.artifact.target?.id);
    expect(artifact?.kind).toBe('video');
    expect(artifact?.generator).toBe('mock-video');
    expect(Obj.getParent(frames[0])?.id).toBe(storyboard.id);
    expect(artifact && Obj.getParent(artifact)?.id).toBe(frames[0].id);
    expect(second.frame.target?.id).toBe(frames[1].id);
  });

  test('list-providers describes each provider with its request schema', async ({ expect }) => {
    const { providers } = await provide(listProviders.handler({ kind: 'video' }));
    expect(providers.map((provider) => provider.id)).toEqual(['mock-video']);
    expect(providers[0].defaultRequest).toEqual({ model: 'mock/v1' });
    expect(providers[0].requestSchema.properties).toHaveProperty('prompt');
    expect((await provide(listProviders.handler({ kind: 'image' }))).providers).toEqual([]);
  });
});
