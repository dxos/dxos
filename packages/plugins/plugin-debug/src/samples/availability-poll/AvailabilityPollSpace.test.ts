//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Feature from '@dxos/plugin-code/Feature';
import * as FeatureEmbed from '@dxos/plugin-code/FeatureEmbed';

import * as AvailabilityPollSpace from './AvailabilityPollSpace.ts';
import { DEPENDENCIES, FEATURES, FLIGHT_FEATURES } from './features.ts';
import { FLIGHTS_PATH, SPEC_PATH } from './spec.ts';

/** Any archived entity, with the fields these checks read; refs are `{ '/': 'echo:///<id>' }`. */
type Archived = {
  '@type'?: string;
  'id': string;
  'name'?: string;
  'status'?: string;
  'requirements'?: Array<{ id?: string; text: string }>;
  'content'?: string | { '/': string };
  'spec'?: { '/': string };
  'specs'?: Array<{ '/': string }>;
  'artifacts'?: Array<{ '/': string }>;
  'objects'?: Array<{ '/': string }>;
  'tasks'?: Array<{ '/': string }>;
  'milestones'?: Array<{ '/': string }>;
  '@relationSource'?: string;
  '@relationTarget'?: string;
  '@meta'?: {
    keys?: Array<{ source: string; id: string }>;
    annotations?: { 'org.dxos.projects.features'?: Array<{ '/': string }> };
  };
};

const ref = (entity: Archived | undefined) => `echo:///${entity?.id}`;

/** The spec blocks an archived feature was read in from, as its foreign keys. */
const sourcesOf = (entity: Archived): string[] =>
  (entity['@meta']?.keys ?? []).filter(({ source }) => source === Feature.SPEC_KEY_SOURCE).map(({ id }) => id);

const load = async () => {
  const { json } = await EffectEx.runPromise(buildArchive(AvailabilityPollSpace.make()));
  const objects: Archived[] = JSON.parse(json).objects;
  const ofType = (typename: string) => objects.filter((object) => object['@type']?.includes(typename));
  const byRef = (target: { '/': string } | undefined) => objects.find((object) => ref(object) === target?.['/']);
  const featuresOf = (spec: Archived | undefined) =>
    (spec?.['@meta']?.annotations?.['org.dxos.projects.features'] ?? []).flatMap((target) => byRef(target) ?? []);
  const textOf = (spec: Archived | undefined) => {
    const content = spec?.content;
    return String(typeof content === 'object' ? byRef(content)?.content : content);
  };
  return { json, objects, ofType, byRef, featuresOf, textOf };
};

/**
 * Built on demand rather than committed, so this asserts the shape in place of a fixture: if a schema it seeds changes
 * incompatibly, the build fails here.
 */
describe('Availability Poll template', () => {
  test(
    'builds the project, the two specs, the features and the design, and no work',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { json } = await load();
      const counts = histogram(json);
      const countOf = (typename: string) =>
        Object.entries(counts)
          .filter(([type]) => type.includes(typename))
          .reduce((total, [, count]) => total + count, 0);

      // With the colon, so the specs' `type.projects.spec` is not counted as a project.
      expect(countOf('type.project:')).toBe(1);
      expect(countOf('type.instructions')).toBe(1);
      expect(countOf('type.taskSet')).toBe(1);
      // Planning from the spec is what the reader watches, so nothing is planned yet.
      expect(countOf('type.milestone')).toBe(0);
      expect(countOf('type.task:')).toBe(0);
      expect(countOf('type.feature:')).toBe(10);
      expect(countOf('type.projects.spec:')).toBe(2);
      expect(countOf('type.document')).toBe(3);
      expect(countOf('type.drawing')).toBe(2);
    },
  );

  // Falsifiable without hardcoding the archive's contents: every typename in the archive must be one the definition
  // declared, which a substring count of a misspelled typename would not catch.
  test('every schema the content persists is declared', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await load();
    const declared = new Set(AvailabilityPollSpace.make().schemas.map((schema) => Type.getTypename(schema)));
    for (const type of Object.keys(histogram(json))) {
      const typename = type.match(/(?:[\w-]+\.)+type\.[\w.]+/)?.[0];
      // `spaceProperties` is the space root the harness creates, in every archive and in no definition.
      if (typename && typename !== 'org.dxos.type.spaceProperties') {
        expect(declared).toContain(typename);
      }
    }
  });

  test(
    'the project owns the poll spec, whose six features are read from its blocks',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { ofType, byRef, featuresOf, textOf } = await load();
      const [project] = ofType('type.project:');
      expect(project.specs).toHaveLength(1);
      const map = byRef(project.specs?.[0]);
      const features = featuresOf(map);

      expect(features.map((feature) => feature.name)).toEqual([
        'Create a poll',
        'Mark availability',
        'Heat map and best slot',
        'Time zones',
        'Daylight-saving time',
        'Flight options',
      ]);
      expect(features.every((feature) => feature.status === 'planned')).toBe(true);
      expect(features.map(sourcesOf)).toEqual(Object.values(FEATURES).map((block) => [`${SPEC_PATH}#${block}`]));
      // The requirements are the spec's own `req` lines, numbered as the spec numbers them.
      expect(features.map((feature) => feature.requirements?.length)).toEqual([6, 5, 5, 3, 4, 1]);
      expect(features[2].requirements?.[1]).toEqual({
        id: 'F-3.2',
        text: 'The best slot is the one the most respondents are free for; on a tie, the earliest. With no marks there is no best slot.',
      });

      expect(map?.['@meta']?.keys).toEqual([{ source: Feature.SPEC_KEY_SOURCE, id: SPEC_PATH }]);
      const text = textOf(map);
      expect(FeatureEmbed.parse(text).map(({ id }) => id)).toEqual(features.map(({ id }) => id));
      expect(text).not.toMatch(/^feat F-/m);
      // The milestones and scenarios stay text: the agent plans from them.
      expect([...text.matchAll(/^\| (M-\d):/gm)].map(([, id]) => id)).toEqual(['M-1', 'M-2', 'M-3']);
      expect([...text.matchAll(/^scenario (T-\d):/gm)].map(([, id]) => id)).toEqual(['T-1', 'T-2']);
    },
  );

  test(
    '"Flight options" owns the flights spec, whose four blocks are its subfeatures',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { ofType, byRef, featuresOf, textOf } = await load();
      const flights = ofType('type.feature:').find((feature) => feature.name === 'Flight options');
      const spec = byRef(flights?.spec);
      const subfeatures = featuresOf(spec);

      expect(subfeatures.map((feature) => feature.name)).toEqual([
        'Trip',
        'Offer search',
        'Pick a flight',
        'Arrival overlay',
      ]);
      expect(subfeatures.every((feature) => feature.status === 'planned')).toBe(true);
      expect(subfeatures.map(sourcesOf)).toEqual(
        Object.values(FLIGHT_FEATURES).map((block) => [`${FLIGHTS_PATH}#${block}`]),
      );
      expect(subfeatures.map((feature) => feature.requirements?.length)).toEqual([2, 4, 2, 2]);
      expect(spec?.['@meta']?.keys).toEqual([{ source: Feature.SPEC_KEY_SOURCE, id: FLIGHTS_PATH }]);
      const text = textOf(spec);
      expect(FeatureEmbed.parse(text).map(({ id }) => id)).toEqual(subfeatures.map(({ id }) => id));
      // It cites the poll spec rather than restating it.
      expect(text).toContain('com.example.availability-poll#F-3');
      expect(text).toContain('com.example.availability-poll#F-4');
    },
  );

  test('the dependencies are exactly the listed pairs, across both specs', { timeout: 120_000 }, async ({ expect }) => {
    const { ofType } = await load();
    const features = ofType('type.feature:');
    const byBlock = (path: string, block: string) =>
      features.find((feature) => sourcesOf(feature).includes(`${path}#${block}`));
    const keyed: Record<string, Archived | undefined> = {
      ...Object.fromEntries(Object.entries(FEATURES).map(([key, block]) => [key, byBlock(SPEC_PATH, block)])),
      ...Object.fromEntries(Object.entries(FLIGHT_FEATURES).map(([key, block]) => [key, byBlock(FLIGHTS_PATH, block)])),
    };

    expect(DEPENDENCIES).toHaveLength(11);
    expect(
      ofType('relation.dependsOn').map((relation) => [relation['@relationSource'], relation['@relationTarget']]),
    ).toEqual(DEPENDENCIES.map(([source, target]) => [ref(keyed[source]), ref(keyed[target])]));
    // No task exists, so nothing implements a feature yet.
    expect(ofType('relation.implements')).toEqual([]);
  });

  test(
    'the design is filed on the project and in the Design collection, in the same order',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { ofType, objects } = await load();
      const [project] = ofType('type.project:');
      const docs = ofType('type.document');
      const drawings = ofType('type.drawing');
      const design = [...docs, ...drawings].map((object) => object.name);

      expect(design).toEqual([
        'Time zones and DST',
        'One Durable Object per poll',
        'Flight search with Duffel',
        'Poll architecture',
        'Flight options architecture',
      ]);
      expect(project.artifacts?.map(({ '/': uri }) => objects.find((object) => ref(object) === uri)?.name)).toEqual(
        design,
      );
      const collection = objects.find(
        (object) => object['@type']?.includes('type.collection') && object.name === 'Design',
      );
      expect(collection?.objects?.map(({ '/': uri }) => objects.find((object) => ref(object) === uri)?.name)).toEqual(
        design,
      );
    },
  );
});
