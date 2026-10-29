//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Feature from '@dxos/plugin-projects/Feature';

import * as RideCheckSpace from './RideCheckSpace.ts';
import { SPEC_PATH } from './spec.ts';

/** A task as the archive serializes it: refs become `{ '/': 'echo:///<id>' }`. */
type ArchivedTask = {
  '@type'?: string;
  'id': string;
  'title'?: string;
  'status'?: string;
  'dependsOn'?: Array<{ '/': string }>;
  'assignee'?: { role?: string; name?: string };
};

/** Any archived entity, with the fields the feature-map checks read. */
type Archived = {
  '@type'?: string;
  'id': string;
  'name'?: string;
  'title'?: string;
  'status'?: string;
  'specs'?: string[];
  'project'?: { '/': string };
  'document'?: { '/': string };
  'spec'?: { '/': string };
  'features'?: Array<{ '/': string }>;
  '@relationSource'?: string;
  '@relationTarget'?: string;
  '@meta'?: { keys?: Array<{ source: string; id: string }> };
};

/** The archive's tasks, in the order they were written. */
const taskArchive = async (definition: ReturnType<typeof RideCheckSpace.make>): Promise<ArchivedTask[]> => {
  const { json } = await EffectEx.runPromise(buildArchive(definition));
  const objects: ArchivedTask[] = JSON.parse(json).objects;
  return objects.filter((object) => object['@type']?.includes('type.task:'));
};

/**
 * Built on demand rather than committed, so this asserts the shape in place of a fixture: if a
 * schema it seeds changes incompatibly, the build fails here.
 */
describe('Ride Check template', () => {
  test(
    'builds the project, its three steps, the spec and the feature map, and nothing else',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { json, objectCount } = await EffectEx.runPromise(buildArchive(RideCheckSpace.make()));
      const counts = histogram(json);
      const countOf = (typename: string) =>
        Object.entries(counts)
          .filter(([type]) => type.includes(typename))
          .reduce((total, [, count]) => total + count, 0);

      expect(objectCount).toBeGreaterThan(0);
      // With the colon, so the specs' `type.projects.spec` is not counted as a project.
      expect(countOf('type.project:')).toBe(1);
      expect(countOf('type.instructions')).toBe(1);
      expect(countOf('type.taskSet')).toBe(1);
      expect(countOf('type.task:')).toBe(3);
      // Four features, and the verdict's two subfeatures.
      expect(countOf('type.feature:')).toBe(6);
      // The map, and the spec that breaks the verdict down; the map holds the one document.
      expect(countOf('type.projects.spec:')).toBe(2);
      expect(countOf('type.specDocument:')).toBe(1);
      // The URL and the diagram are what the run produces, so the space ships no documents.
      expect(countOf('type.document')).toBe(0);
    },
  );

  // The feature map is the page seen card by card: one feature per spec block, the rest depending on the verdict.
  test(
    'the feature map files a feature per spec block, and opens the spec in the space',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { json } = await EffectEx.runPromise(buildArchive(RideCheckSpace.make()));
      const objects: Archived[] = JSON.parse(json).objects;
      const ofType = (typename: string) => objects.filter((object) => object['@type']?.includes(typename));
      const [project] = ofType('type.project:');
      const all = ofType('type.feature:');
      const byRef = (ref: { '/': string } | undefined) =>
        objects.find((object) => `echo:///${object.id}` === ref?.['/']);
      const map = ofType('type.projects.spec:').find((spec) => spec.project);
      const features = (map?.features ?? []).flatMap((ref) => byRef(ref) ?? []);
      const tasks = ofType('type.task:');

      expect(features.map((feature) => feature.name)).toEqual([
        'Go / no-go',
        'Hourly forecast',
        'Best window',
        'Daylight',
      ]);
      expect(features.every((feature) => feature.status === 'planned')).toBe(true);
      // The verdict's parts are features of their own, on the spec that breaks it down.
      const subfeatures = (byRef(features[0].spec)?.features ?? []).flatMap((ref) => byRef(ref) ?? []);
      expect(subfeatures.map((feature) => feature.name)).toEqual(['Rain rule', 'Wind rule']);
      expect(all).toHaveLength(features.length + subfeatures.length);
      expect(map?.project?.['/']).toBe(`echo:///${project.id}`);
      expect(features.map((feature) => feature.specs)).toEqual(
        ['F-1', 'F-2', 'F-3', 'F-4'].map((feat) => [`${SPEC_PATH}#${feat}`]),
      );

      // Every other card reads the verdict's forecast.
      const dependsOn = ofType('relation.dependsOn');
      expect(dependsOn.map((relation) => [relation['@relationSource'], relation['@relationTarget']])).toEqual(
        features.slice(1).map((feature) => [`echo:///${feature.id}`, `echo:///${features[0].id}`]),
      );

      // The build task ships every card, so each card shows it.
      const implementsLinks = ofType('relation.implements').map((relation) => [
        relation['@relationSource'],
        relation['@relationTarget'],
      ]);
      const build = tasks.find((task) => task.title === 'Build and deploy the Worker');
      expect(implementsLinks).toEqual(features.map((feature) => [`echo:///${build?.id}`, `echo:///${feature.id}`]));

      // The map's document is the space's copy of the path the features cite, so their cards open it instead of GitHub.
      const [document] = ofType('type.specDocument:');
      expect(map?.document?.['/']).toBe(`echo:///${document.id}`);
      expect(document['@meta']?.keys).toEqual([{ source: Feature.SPEC_KEY_SOURCE, id: SPEC_PATH }]);
      for (const feature of features) {
        expect(Feature.getSpecPath(feature.specs?.[0] ?? '')).toBe(SPEC_PATH);
      }
    },
  );

  // Falsifiable without hardcoding the archive's contents: every typename in the archive must be one
  // the definition DECLARED. The zero-count above would not be - `countOf` substring-matches, so
  // asserting a typename is absent passes just as well when the typename is misspelled.
  test('every schema the content persists is declared', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(RideCheckSpace.make()));
    const declared = new Set(RideCheckSpace.make().schemas.map((schema) => Type.getTypename(schema)));

    for (const type of Object.keys(histogram(json))) {
      // Not namespace-limited: `Project.make` persists `com.example.type.project`, so matching only
      // `org.dxos.*` would let the project's own types go unchecked.
      const typename = type.match(/(?:[\w-]+\.)+type\.[\w.]+/)?.[0];
      // `spaceProperties` is the space root the harness creates, not a phase's content, so it is in
      // every archive and in no definition's schema list.
      if (typename && typename !== 'org.dxos.type.spaceProperties') {
        expect(declared).toContain(typename);
      }
    }
  });

  test('every step is todo and each depends on the one before it', { timeout: 120_000 }, async ({ expect }) => {
    const tasks = await taskArchive(RideCheckSpace.make());

    expect(tasks.map((task) => task.title)).toEqual([
      'Draw the architecture',
      'Build and deploy the Worker',
      'Check the live page against the spec',
    ]);
    expect(tasks.every((task) => task.status === 'todo')).toBe(true);

    // The identity each dependency names, not merely how many there are: a chain wired to the wrong
    // predecessor has the same shape as the right one and would otherwise pass.
    expect(tasks.map((task) => task.dependsOn?.map((ref) => ref['/']))).toEqual([
      undefined,
      ...tasks.slice(0, -1).map((task) => [`echo:///${task.id}`]),
    ]);
  });

  // The reader decides who runs the plan, so no seeded task is assigned.
  test('no seeded task is assigned', { timeout: 120_000 }, async ({ expect }) => {
    const tasks = await taskArchive(RideCheckSpace.make());
    expect(tasks.filter((task) => task.assignee !== undefined)).toEqual([]);
  });
});
