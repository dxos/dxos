//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import { Feature } from '#types';

import { WORLD_CLOCK_SPEC_PATH, registryVariant } from '../../templates/composer-plugin.ts';
import * as WorldClockSpace from './WorldClockSpace.ts';

const VARIANT = registryVariant(
  {
    commit: '0123456789abcdef0123456789abcdef01234567',
    versions: { 'effect': '4.0.0', 'react': '19.2.8', 'react-dom': '19.2.8' },
  },
  'https://edge.example.com/',
);

/** Any archived entity, with the fields the checks read; refs become `{ '/': 'echo:///<id>' }`. */
type Archived = {
  '@type'?: string;
  'id': string;
  'name'?: string;
  'title'?: string;
  'status'?: string;
  'description'?: string;
  'specs'?: string[];
  'project'?: { '/': string };
  'artifacts'?: Array<{ '/': string }>;
  '@relationSource'?: string;
  '@relationTarget'?: string;
  '@meta'?: { keys?: Array<{ source: string; id: string }> };
};

const archive = async () => {
  const { json } = await EffectEx.runPromise(buildArchive(WorldClockSpace.make(VARIANT)));
  const objects: Archived[] = JSON.parse(json).objects;
  return { json, ofType: (typename: string) => objects.filter((object) => object['@type']?.includes(typename)) };
};

describe('World Clock template', () => {
  test(
    'builds the project, its five tasks, the spec and one feature per feat block',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { json, ofType } = await archive();
      const counts = histogram(json);
      const countOf = (typename: string) =>
        Object.entries(counts)
          .filter(([type]) => type.includes(typename))
          .reduce((total, [, count]) => total + count, 0);

      expect(countOf('type.project')).toBe(1);
      expect(countOf('type.instructions')).toBe(1);
      expect(countOf('type.taskSet')).toBe(1);
      expect(countOf('type.task:')).toBe(5);
      expect(countOf('type.spec:')).toBe(1);
      expect(countOf('type.feature:')).toBe(5);

      const [project] = ofType('type.project');
      const [spec] = ofType('type.spec:');
      expect(project.name).toBe('World Clock');
      expect(project.artifacts).toEqual([{ '/': `echo:///${spec.id}` }]);
      expect(spec['@meta']?.keys).toEqual([{ source: Feature.SPEC_KEY_SOURCE, id: WORLD_CLOCK_SPEC_PATH }]);
    },
  );

  test(
    'the feature map cites the spec, and the parent task implements every feature',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { ofType } = await archive();
      const [project] = ofType('type.project');
      const features = ofType('type.feature:');
      expect(features.map((feature) => feature.name)).toEqual([
        'Clocks page',
        'World map',
        'Live clocks',
        'Edit clocks',
        'Bundled specification',
      ]);
      expect(features.every((feature) => feature.status === 'planned')).toBe(true);
      expect(features.every((feature) => feature.project?.['/'] === `echo:///${project.id}`)).toBe(true);
      expect(features.map((feature) => feature.specs)).toEqual(
        ['F-1', 'F-2', 'F-3', 'F-4', 'F-5'].map((feat) => [`${WORLD_CLOCK_SPEC_PATH}#${feat}`]),
      );

      const [root, ...rest] = features;
      expect(
        ofType('relation.dependsOn').map((relation) => [relation['@relationSource'], relation['@relationTarget']]),
      ).toEqual(rest.map((feature) => [`echo:///${feature.id}`, `echo:///${root.id}`]));

      const parent = ofType('type.task:').find((task) => task.title === 'Build the World Clock plugin');
      expect(
        ofType('relation.implements').map((relation) => [relation['@relationSource'], relation['@relationTarget']]),
      ).toEqual(features.map((feature) => [`echo:///${parent?.id}`, `echo:///${feature.id}`]));
    },
  );

  test('every schema the content persists is declared', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await archive();
    const declared = new Set(WorldClockSpace.make(VARIANT).schemas.map((schema) => Type.getTypename(schema)));
    for (const type of Object.keys(histogram(json))) {
      const typename = type.match(/(?:[\w-]+\.)+type\.[\w.]+/)?.[0];
      // The space root the harness creates is in every archive and in no definition's schema list.
      if (typename && typename !== 'org.dxos.type.spaceProperties') {
        expect(declared).toContain(typename);
      }
    }
  });
});
