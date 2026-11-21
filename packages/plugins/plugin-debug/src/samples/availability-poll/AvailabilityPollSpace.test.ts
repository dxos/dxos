//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Feature from '@dxos/plugin-code/Feature';

import * as AvailabilityPollSpace from './AvailabilityPollSpace.ts';
import { DEPENDENCIES, FEATURES, FLIGHT_FEATURES } from './features.ts';
import { FLIGHTS_PATH, SPEC_PATH } from './spec.ts';

/** Any archived entity, with the fields these checks read; refs are `{ '/': 'echo:///<id>' }`. */
type Archived = {
  '@type'?: string;
  'id': string;
  'name'?: string;
  'content'?: string | { '/': string };
  'spec'?: { '/': string };
  'specs'?: Array<{ '/': string }>;
  'artifacts'?: Array<{ '/': string }>;
  'objects'?: Array<{ '/': string }>;
  'tasks'?: Array<{ '/': string }>;
  'milestones'?: Array<{ '/': string }>;
  '@meta'?: { keys?: Array<{ source: string; id: string }> };
};

const ref = (entity: Archived | undefined) => `echo:///${entity?.id}`;

/** A spec text's `feat` blocks in order, with the lines these checks read. */
const featsOf = (text: string) =>
  text
    .split(/^(?=feat F-)/m)
    .slice(1)
    .map((block) => ({
      key: block.match(/^feat (F-\d+):/)![1],
      title: block.match(/^feat F-\d+: (.*)$/m)![1],
      status: block.match(/^ {2}status: (.*)$/m)?.[1],
      depends: block.match(/^ {2}depends: \[(.*)\]$/m)?.[1].split(', ') ?? [],
      spec: block.match(/^ {2}spec: (.*)$/m)?.[1],
      requirements: block.match(/^ {2}req F-/gm)?.length ?? 0,
    }));

const load = async () => {
  const { json } = await EffectEx.runPromise(buildArchive(AvailabilityPollSpace.make()));
  const objects: Archived[] = JSON.parse(json).objects;
  const ofType = (typename: string) => objects.filter((object) => object['@type']?.includes(typename));
  const byRef = (target: { '/': string } | undefined) => objects.find((object) => ref(object) === target?.['/']);
  const textOf = (spec: Archived | undefined) => {
    const content = spec?.content;
    return String(typeof content === 'object' ? byRef(content)?.content : content);
  };
  const [project] = ofType('type.project:');
  const [map, flights] = (project.specs ?? []).map((target) => byRef(target));
  return { json, objects, ofType, byRef, textOf, project, map, flights };
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
      // The features are blocks of the specs' text, not objects.
      expect(countOf('type.feature:')).toBe(0);
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
    'the project owns the poll spec, whose eight feat blocks are the feature map',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { project, map, textOf } = await load();
      expect(project.specs).toHaveLength(2);
      const text = textOf(map);
      const feats = featsOf(text);

      expect(feats.map(({ key, title }) => `${key} ${title}`)).toEqual([
        'F-1 Create a poll',
        'F-2 Mark availability',
        'F-3 Heat map and best slot',
        'F-4 New poll page',
        'F-5 Poll page',
        'F-6 Time zones',
        'F-7 Daylight-saving time',
        'F-8 Flight options',
      ]);
      expect(feats.map(({ key }) => key)).toEqual(Object.values(FEATURES));
      expect(feats.every(({ status }) => status === 'planned')).toBe(true);
      // The requirements stay the spec's own `req` lines.
      expect(feats.map(({ requirements }) => requirements)).toEqual([4, 3, 4, 3, 7, 3, 4, 1]);
      expect(map?.['@meta']?.keys).toEqual([{ source: Feature.SPEC_KEY_SOURCE, id: SPEC_PATH }]);
      // The milestones and scenarios stay text: the agent plans from them.
      expect([...text.matchAll(/^\| (M-\d):/gm)].map(([, id]) => id)).toEqual(['M-1', 'M-2', 'M-3', 'M-4']);
      expect([...text.matchAll(/^scenario (T-\d):/gm)].map(([, id]) => id)).toEqual(['T-1', 'T-2', 'T-3']);
    },
  );

  test(
    '"Flight options" cites the flights spec, whose four feat blocks are its subfeatures',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { map, flights, textOf } = await load();
      expect(featsOf(textOf(map)).find(({ key }) => key === FEATURES.flights)?.spec).toBe(`echo:///${flights?.id}`);
      const text = textOf(flights);
      const feats = featsOf(text);

      expect(feats.map(({ key, title }) => `${key} ${title}`)).toEqual([
        'F-1 Trip',
        'F-2 Offer search',
        'F-3 Pick a flight',
        'F-4 Arrival overlay',
      ]);
      expect(feats.every(({ status }) => status === 'planned')).toBe(true);
      expect(feats.map(({ requirements }) => requirements)).toEqual([2, 4, 2, 2]);
      expect(flights?.['@meta']?.keys).toEqual([{ source: Feature.SPEC_KEY_SOURCE, id: FLIGHTS_PATH }]);
      // It cites the poll spec rather than restating it.
      expect(text).toContain('com.example.availability-poll#F-3');
      expect(text).toContain('com.example.availability-poll#F-6');
    },
  );

  test('the dependencies are exactly the listed pairs, across both specs', { timeout: 120_000 }, async ({ expect }) => {
    const { ofType, map, flights, textOf } = await load();
    const all: Record<string, { spec: Archived | undefined; key: string }> = {
      ...Object.fromEntries(Object.entries(FEATURES).map(([name, key]) => [name, { spec: map, key }])),
      ...Object.fromEntries(Object.entries(FLIGHT_FEATURES).map(([name, key]) => [name, { spec: flights, key }])),
    };
    // A block in the same spec is named by its key; one in the other spec by its spec item link.
    const cite = (from: Archived | undefined, { spec, key }: { spec: Archived | undefined; key: string }) =>
      spec === from ? key : `${ref(spec)}#${key}`;
    const stated = [map, flights].flatMap((spec) =>
      featsOf(textOf(spec)).flatMap(({ key, depends }) => depends.map((needed) => [`${ref(spec)}#${key}`, needed])),
    );

    expect(DEPENDENCIES).toHaveLength(13);
    expect(stated.toSorted()).toEqual(
      DEPENDENCIES.map(([source, target]) => {
        const from = all[source];
        return [`${ref(from.spec)}#${from.key}`, cite(from.spec, all[target])];
      }).toSorted(),
    );
    // No task exists, so nothing implements a feature yet.
    expect(ofType('relation.implementsItem')).toEqual([]);
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
