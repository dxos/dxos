//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import * as Spec from '@dxos/compute/Spec';
import { Database, Filter } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import type * as FileSystem from '@dxos/plugin-file-system/FileSystem';
import { Text } from '@dxos/schema';

import importSpec from './import-spec.ts';

const files: Record<string, string> = {};

vi.mock('@dxos/plugin-file-system/FileSystem', () => ({
  get: (): FileSystem.FileSystem => ({
    kind: 'dev',
    available: () => Effect.succeed(true),
    read: (path) => Effect.succeed(files[path]),
    write: () => Effect.void,
    remove: () => Effect.void,
    list: () => Effect.succeed([]),
    roots: () => Effect.succeed([{ repo: 'dxos/dxos', path: '/src' }]),
  }),
}));

describe('ImportSpec', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('a file whose front matter does not parse is not imported', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Spec.Spec, Text.Text]);
    files['/src/a/PLUGIN.mdl'] = '---\nname: Launch: v2\n---\n\nBody\n';
    const run = <A, E>(effect: Effect.Effect<A, E, Database.Service | Capability.Service>) =>
      effect.pipe(
        Effect.provide(Database.layer(db)),
        Effect.provideService(Capability.Service, CapabilityManager.make({ registry: Registry.make() })),
        EffectEx.runAndForwardErrors,
      );

    await expect(run(importSpec.handler({ key: 'github:dxos/dxos/a/PLUGIN.mdl' }))).rejects.toThrow(/does not parse/);
    expect(await db.query(Filter.type(Spec.Spec)).run()).toEqual([]);
  });
});
