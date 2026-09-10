//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { EffectEx } from '@dxos/effect';

import { IncidentSpace } from './index';

/**
 * Built on demand rather than committed, so this asserts the shape in place of a fixture: if a
 * schema it seeds changes incompatibly, the build fails here.
 */
describe('Incident sample space', () => {
  test('builds the project, its sources and its four steps', { timeout: 120_000 }, async ({ expect }) => {
    const { json, objectCount } = await EffectEx.runPromise(buildArchive(IncidentSpace()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(objectCount).toBeGreaterThan(0);
    expect(countOf('type.project')).toBe(1);
    expect(countOf('type.instructions')).toBe(1);
    expect(countOf('type.taskSet')).toBe(1);
    // The log and four notes. The retro, timeline and notice are the work, so they are absent.
    expect(countOf('type.document')).toBe(5);
    expect(countOf('type.task:')).toBe(4);
  });

  test('every step is todo and each depends on the one before it', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(IncidentSpace()));
    const objects: Array<{ '@type'?: string; 'title'?: string; 'status'?: string; 'dependsOn'?: unknown }> =
      JSON.parse(json).objects;
    const tasks = objects.filter((object) => object['@type']?.includes('type.task:'));

    expect(tasks.map((task) => task.title)).toEqual([
      'Reconstruct the timeline',
      'Write the retrospective',
      'File the action items',
      'Draft the customer notice',
    ]);
    expect(tasks.every((task) => task.status === 'todo')).toBe(true);
    expect(tasks.filter((task) => Array.isArray(task.dependsOn) && task.dependsOn.length > 0)).toHaveLength(3);
  });

  test(
    'the log contradicts the notes on the points the retro must get right',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { json } = await EffectEx.runPromise(buildArchive(IncidentSpace()));
      const objects: Array<{ '@type'?: string; 'content'?: string }> = JSON.parse(json).objects;
      const texts = objects
        .filter((object) => object['@type']?.includes('type.text'))
        .map((object) => object.content ?? '');
      const all = texts.join('\n');

      // The distractors are present in the notes, and the log rules each one out.
      expect(all).toContain('Friday deploys');
      expect(all).toContain('No deploys');
      expect(all).toContain('ran out of disk');
      expect(all).toContain('Database disk usage held');
    },
  );
});
