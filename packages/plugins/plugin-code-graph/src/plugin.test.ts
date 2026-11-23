//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceEvents from '@dxos/plugin-space/SpaceEvents';
import * as Harness from '@dxos/plugin-testing/Harness';
import * as TypeSafePlugin from '@dxos/plugin-typesafe/TypeSafePlugin';

import * as CodeGraphPlugin from '#meta';
import { CodeGraph } from '#types';

import { CodeGraphNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), TypeSafePlugin.make(), CodeGraphPlugin.make()] });

const moduleId = (name: string) => `${CodeGraphNamespace.key}.module.${name}`;

describe('CodeGraphPlugin', () => {
  test('schema and operation handlers activate', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), TypeSafePlugin.make(), CodeGraphPlugin.make()],
    });
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
  });

  test('the create-object entry makes a code graph', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), TypeSafePlugin.make(), CodeGraphPlugin.make()],
    });
    await harness.fire(SpaceEvents.CreateObjectRequested);
    const entry = harness
      .getAll(SpaceCapabilities.CreateObjectEntry)
      .find(({ id }) => id === 'org.dxos.type.codeGraph');
    expect(entry).toBeDefined();
  });

  test('make starts empty with the illustrator layout', ({ expect }) => {
    const graph = CodeGraph.make({ name: 'test' });
    expect(graph.layout).toBe('illustrator');
    expect(graph.nodes).toHaveLength(0);
    expect(graph.edges).toHaveLength(0);
  });
});
