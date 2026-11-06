//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as TimelineSpace from './TimelineSpace.ts';

describe('Timeline project template', () => {
  test('builds the project, its feature map and its tasks', { timeout: 120_000 }, async ({ expect }) => {
    const { result, json } = await EffectEx.runPromise(buildArchive(TimelineSpace.make()));
    const { project, map, breakdowns, tasks, fixture } = result.timeline;
    const archive: { objects: Array<{ 'id': string; '@type'?: string; 'content'?: unknown }> } = JSON.parse(json);
    const content = String(archive.objects.find((object) => map.content.uri.endsWith(object.id))?.content);

    expect(project.name).toBe('Timeline');
    // Every feature is one of the spec's feat blocks, the research skill's written from the seed.
    expect([...content.matchAll(/^feat (F-\d+): (.*)$/gm)].map(([, id, title]) => `${id} ${title}`)).toEqual([
      'F-1 Chart objects',
      'F-2 Timeline chart',
      'F-3 Slide embeds',
      'F-4 Presenter space',
      'F-5 Timeline research skill',
    ]);
    const specs = [map, ...breakdowns];
    expect(project.specs.map((ref, index) => ref.uri.endsWith(specs[index].id))).toEqual(specs.map(() => true));
    expect(tasks.map((task) => task.title)).toEqual([
      'Create a test fixture',
      'Complete the spec',
      'Draw the proposed architecture',
      'Implement phase 1 of the spec',
      'Decide where the research skill lives',
      'Check Escape with an embed showing',
    ]);

    // The fixture is done and files the events sheet, which the project lists too.
    const [fixtureTask, ...planned] = tasks;
    expect(fixtureTask.status).toBe('done');
    expect(fixtureTask.artifacts?.map((ref) => ref.uri.endsWith(fixture.id))).toEqual([true]);
    expect(project.artifacts.some((ref) => ref.uri.endsWith(fixture.id))).toBe(true);

    expect(planned.every((task) => task.status === 'todo')).toBe(true);
    expect(planned[2].dependsOn?.map((ref) => ref.uri.endsWith(planned[1].id))).toEqual([true]);

    // Every task is linked to a feature, and the features' needs are fields of their blocks.
    const count = (type: string) => archive.objects.filter((object) => object['@type']?.includes(type)).length;
    expect(count('org.dxos.relation.implementsItem')).toBe(6);
    expect(content.match(/^  needs: /gm)).toHaveLength(4);
  });
});
