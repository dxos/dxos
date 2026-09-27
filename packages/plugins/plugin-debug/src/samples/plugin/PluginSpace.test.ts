//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

import * as PluginSpace from './PluginSpace.ts';

/** An object as the archive serializes it: refs become `{ '/': <uri> }`. */
type ArchivedObject = {
  '@type'?: string;
  'id': string;
  'title'?: string;
  'status'?: string;
  'dependsOn'?: Array<{ '/': string }>;
  'skills'?: Array<{ '/': string }>;
};

const archivedObjects = async (): Promise<ArchivedObject[]> => {
  const { json } = await EffectEx.runPromise(buildArchive(PluginSpace.make()));
  return JSON.parse(json).objects;
};

/**
 * Built on demand rather than committed, so this asserts the shape in place of a fixture: if a
 * schema it seeds changes incompatibly, the build fails here.
 */
describe('Plugin template', () => {
  test('builds the project and its four steps, and nothing else', { timeout: 120_000 }, async ({ expect }) => {
    const { json, objectCount } = await EffectEx.runPromise(buildArchive(PluginSpace.make()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(objectCount).toBeGreaterThan(0);
    expect(countOf('type.project')).toBe(1);
    expect(countOf('type.instructions')).toBe(1);
    expect(countOf('type.taskSet')).toBe(1);
    expect(countOf('type.task:')).toBe(4);
  });

  test('every schema the content persists is declared', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(PluginSpace.make()));
    const declared = new Set(PluginSpace.make().schemas.map((schema) => Type.getTypename(schema)));

    for (const type of Object.keys(histogram(json))) {
      const typename = type.match(/(?:[\w-]+\.)+type\.[\w.]+/)?.[0];
      // `spaceProperties` is the space root the harness creates, in every archive and no definition.
      if (typename && typename !== 'org.dxos.type.spaceProperties') {
        expect(declared).toContain(typename);
      }
    }
  });

  test('every step is todo and each depends on the one before it', { timeout: 120_000 }, async ({ expect }) => {
    const tasks = (await archivedObjects()).filter((object) => object['@type']?.includes('type.task:'));

    expect(tasks.map((task) => task.title)).toEqual([
      'Read the plugin guide',
      'Write the plugin in TypeScript',
      'Typecheck and build',
      'Offer the plugin to load',
    ]);
    expect(tasks.every((task) => task.status === 'todo')).toBe(true);
    expect(tasks.map((task) => task.dependsOn?.map((ref) => ref['/']))).toEqual([
      undefined,
      ...tasks.slice(0, -1).map((task) => [`echo:///${task.id}`]),
    ]);
  });

  // The shell is the only way the run reaches the toolchain; unbound, the chat has nothing to build with.
  test('the instructions bind the Computer skill', { timeout: 120_000 }, async ({ expect }) => {
    const instructions = (await archivedObjects()).find((object) => object['@type']?.includes('type.instructions'));

    expect(instructions?.skills?.map((ref) => ref['/'])).toEqual(['dxn:org.dxos.skill.computer']);
  });
});
