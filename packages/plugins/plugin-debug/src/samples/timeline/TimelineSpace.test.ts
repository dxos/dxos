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
    const { project, features, tasks } = result.timeline;

    expect(project.name).toBe('Timeline');
    expect(features.map((feature) => feature.name)).toEqual([
      'Chart objects',
      'Timeline chart',
      'Slide embeds',
      'Presenter space',
      'Timeline research skill',
    ]);
    expect(features.every((feature) => feature.project?.uri.endsWith(project.id))).toBe(true);
    expect(tasks).toHaveLength(5);

    // Every task is linked to a feature, and the features' needs are drawn as edges.
    const archive: { objects: Array<{ '@type'?: string }> } = JSON.parse(json);
    const count = (type: string) => archive.objects.filter((object) => object['@type']?.includes(type)).length;
    expect(count('org.dxos.relation.implements')).toBe(5);
    expect(count('org.dxos.relation.dependsOn')).toBe(5);
  });
});
