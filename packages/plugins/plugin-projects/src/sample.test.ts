//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { EffectEx } from '@dxos/effect';

import { TidepoolSpace } from '../scripts/sample';

/**
 * The Tidepool sample space is built on demand rather than committed, so this asserts its shape in
 * place of a fixture: if a schema it seeds changes incompatibly, the build fails here.
 */
describe('Tidepool sample space', () => {
  test('builds an archive with the whole project graph', { timeout: 120_000 }, async ({ expect }) => {
    const { json, objectCount } = await EffectEx.runPromise(buildArchive(TidepoolSpace()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(objectCount).toBeGreaterThan(0);
    expect(countOf('type.project')).toBe(1);
    expect(countOf('type.repo')).toBe(1);
    expect(countOf('type.taskSet')).toBe(1);
    expect(countOf('type.milestone')).toBe(3);
    expect(countOf('type.organization')).toBe(2);
    expect(countOf('type.person')).toBe(6);
    expect(countOf('type.document')).toBe(3);
    expect(countOf('type.outline')).toBe(1);
    // Six roots, eleven sub-tasks (three of them one level deeper).
    expect(countOf('type.task:')).toBe(17);
  });

  test('files every sub-task under a parent, at two levels', async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(TidepoolSpace()));
    const objects: Array<{ '@type'?: string; 'id': string; 'title'?: string; 'parentTask'?: unknown }> =
      JSON.parse(json).objects;
    const tasks = objects.filter((object) => object['@type']?.includes('type.task:'));
    const children = tasks.filter((task) => task.parentTask !== undefined);

    expect(tasks.filter((task) => task.parentTask === undefined)).toHaveLength(6);
    expect(children).toHaveLength(11);

    // The migration sub-task has children of its own — the level Bramble's flat task set never
    // exercised. Refs serialize as an envelope, so the parent is matched by id within it.
    const migration = tasks.find((task) => task.title?.startsWith('Migrate notes written'));
    expect(migration?.id).toBeDefined();
    const grandchildren = children.filter((task) => JSON.stringify(task.parentTask).includes(String(migration?.id)));
    expect(grandchildren).toHaveLength(3);
  });
});
