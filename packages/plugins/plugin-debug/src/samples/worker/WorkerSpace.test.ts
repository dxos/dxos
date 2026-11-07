//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Feature from '@dxos/plugin-code/Feature';

import { SPEC_PATH } from './spec.ts';

/** The `feat` block headers of a spec text, in order. */
const featHeaders = (text: string) =>
  [...text.matchAll(/^feat (F-\d+): (.*)$/gm)].map(([, id, title]) => `${id} ${title}`);
import * as WorkerSpace from './WorkerSpace.ts';

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
  'content'?: string | { '/': string };
  'spec'?: { '/': string };
  'specs'?: Array<{ '/': string }>;
  'item'?: string;
  '@relationSource'?: string;
  '@relationTarget'?: string;
  '@meta'?: { keys?: Array<{ source: string; id: string }> };
};

/** The archive's tasks, in the order they were written. */
const taskArchive = async (definition: ReturnType<typeof WorkerSpace.make>): Promise<ArchivedTask[]> => {
  const { json } = await EffectEx.runPromise(buildArchive(definition));
  const objects: ArchivedTask[] = JSON.parse(json).objects;
  return objects.filter((object) => object['@type']?.includes('type.task:'));
};

/**
 * Built on demand rather than committed, so this asserts the shape in place of a fixture: if a
 * schema it seeds changes incompatibly, the build fails here.
 */
describe('Worker template', () => {
  test(
    'builds the project, its three planning steps, the spec and the feature map, and nothing else',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { json, objectCount } = await EffectEx.runPromise(buildArchive(WorkerSpace.make()));
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
      // The features are blocks of the specs' text, not objects.
      expect(countOf('type.feature:')).toBe(0);
      // The map, and the spec that breaks the endpoint down; each owns its text.
      expect(countOf('type.projects.spec:')).toBe(2);
      // The URL and the response body are what the run produces, so the space ships no documents.
      expect(countOf('type.document')).toBe(0);
    },
  );

  // The feature map is the plan seen from what the Worker must do: one feat block per block the finished spec will
  // have, each needing the one before it.
  test(
    'the feature map states a feat block per planned block, and opens the spec in the space',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { json } = await EffectEx.runPromise(buildArchive(WorkerSpace.make()));
      const objects: Archived[] = JSON.parse(json).objects;
      const ofType = (typename: string) => objects.filter((object) => object['@type']?.includes(typename));
      const [project] = ofType('type.project:');
      const byRef = (ref: { '/': string } | undefined) =>
        objects.find((object) => `echo:///${object.id}` === ref?.['/']);
      const textOf = (spec: Archived | undefined) => {
        const content = spec?.content;
        return String(typeof content === 'object' ? byRef(content)?.content : '');
      };
      const [map, breakdown] = (project.specs ?? []).map(byRef);
      const text = textOf(map);

      expect(featHeaders(text)).toEqual([
        'F-1 Greeting endpoint',
        'F-2 Deploy without an account',
        'F-3 Verified response',
        'F-4 Claimed account',
      ]);
      expect(text.match(/^  status: planned$/gm)).toHaveLength(4);
      expect(text.match(/^  depends: \[F-\d\]$/gm)).toHaveLength(3);
      // The endpoint's parts are features of their own, on the spec that breaks it down.
      expect(text).toContain(`spec: echo:///${breakdown?.id}`);
      expect(featHeaders(textOf(breakdown))).toEqual(['F-1 JSON greeting', 'F-2 UTC time']);

      // Only the diagram is seeded against a feature, the endpoint it draws; the agent links the tasks it files.
      const diagram = ofType('type.task:').find((task) => task.title === 'Draw the proposed architecture');
      expect(
        ofType('relation.implementsItem').map((relation) => [
          relation['@relationSource'],
          relation['@relationTarget'],
          relation.item,
        ]),
      ).toEqual([[`echo:///${diagram?.id}`, `echo:///${map?.id}`, 'F-1']]);

      // The map is the space's copy of the path the spec was read from.
      expect(map?.['@meta']?.keys).toEqual([{ source: Feature.SPEC_KEY_SOURCE, id: SPEC_PATH }]);
    },
  );

  // Falsifiable without hardcoding the archive's contents: every typename in the archive must be one
  // the definition DECLARED. The zero-count above would not be — `countOf` substring-matches, so
  // asserting a typename is absent passes just as well when the typename is misspelled.
  test('every schema the content persists is declared', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(WorkerSpace.make()));
    const declared = new Set(WorkerSpace.make().schemas.map((schema) => Type.getTypename(schema)));

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
    const tasks = await taskArchive(WorkerSpace.make());

    expect(tasks.map((task) => task.title)).toEqual([
      'Complete the spec',
      'Draw the proposed architecture',
      'Plan the implementation as tasks',
    ]);
    expect(tasks.every((task) => task.status === 'todo')).toBe(true);

    // The identity each dependency names, not merely how many there are: a chain wired to the wrong
    // predecessor has the same shape as the right one and would otherwise pass.
    expect(tasks.map((task) => task.dependsOn?.map((ref) => ref['/']))).toEqual([
      undefined,
      ...tasks.slice(0, -1).map((task) => [`echo:///${task.id}`]),
    ]);
  });

  // The template seeds the plan, not the work: the agent files the implementation tasks, the reader's claim among
  // them, so no seeded task is assigned.
  test('no seeded task is assigned', { timeout: 120_000 }, async ({ expect }) => {
    const tasks = await taskArchive(WorkerSpace.make());
    expect(tasks.filter((task) => task.assignee !== undefined)).toEqual([]);
  });
});
