//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Feature from '@dxos/plugin-projects/Feature';
import * as FeatureMap from '@dxos/plugin-projects/FeatureMap';

import * as TimelineSpace from './TimelineSpace.ts';

describe('Timeline project template', () => {
  test('builds the project, its feature map and its tasks', { timeout: 120_000 }, async ({ expect }) => {
    const { result, json } = await EffectEx.runPromise(buildArchive(TimelineSpace.make()));
    const { project, map, features, tasks, fixture } = result.timeline;

    expect(project.name).toBe('Timeline');
    expect(features.map((feature) => feature.name)).toEqual([
      'Chart objects',
      'Timeline chart',
      'Slide embeds',
      'Presenter space',
      'Timeline research skill',
    ]);
    expect(project.specs.map((ref) => ref.uri.endsWith(map.id))).toEqual([true]);
    expect(FeatureMap.getFeatures(map).map((ref, index) => ref.uri.endsWith(features[index].id))).toEqual(
      features.map(() => true),
    );
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

    // Every feature cites one of the spec's blocks.
    expect(features.map((feature) => Feature.getSources(feature))).toEqual(
      [1, 2, 3, 4, 5].map((index) => [`timeline/SPEC.mdl#F-${index}`]),
    );
    expect(planned.every((task) => task.status === 'todo')).toBe(true);
    expect(planned[2].dependsOn?.map((ref) => ref.uri.endsWith(planned[1].id))).toEqual([true]);

    // Every task is linked to a feature, and the features' needs are drawn as edges.
    const archive: { objects: Array<{ '@type'?: string }> } = JSON.parse(json);
    const count = (type: string) => archive.objects.filter((object) => object['@type']?.includes(type)).length;
    expect(count('org.dxos.relation.implements')).toBe(6);
    expect(count('org.dxos.relation.dependsOn')).toBe(5);
  });
});
