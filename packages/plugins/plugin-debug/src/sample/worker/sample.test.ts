//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

import { WorkerSpace } from './index';

/** A task as the archive serializes it: refs become `{ '/': 'echo:///<id>' }`. */
type ArchivedTask = {
  '@type'?: string;
  'id': string;
  'title'?: string;
  'status'?: string;
  'dependsOn'?: Array<{ '/': string }>;
  'assignee'?: { role?: string; name?: string };
};

/** The archive's tasks, in the order they were written. */
const taskArchive = async (definition: ReturnType<typeof WorkerSpace>): Promise<ArchivedTask[]> => {
  const { json } = await EffectEx.runPromise(buildArchive(definition));
  const objects: ArchivedTask[] = JSON.parse(json).objects;
  return objects.filter((object) => object['@type']?.includes('type.task:'));
};

/**
 * Built on demand rather than committed, so this asserts the shape in place of a fixture: if a
 * schema it seeds changes incompatibly, the build fails here.
 */
describe('Worker sample space', () => {
  test('builds the project and its five steps, and nothing else', { timeout: 120_000 }, async ({ expect }) => {
    const { json, objectCount } = await EffectEx.runPromise(buildArchive(WorkerSpace()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(objectCount).toBeGreaterThan(0);
    expect(countOf('type.project')).toBe(1);
    expect(countOf('type.instructions')).toBe(1);
    expect(countOf('type.taskSet')).toBe(1);
    expect(countOf('type.task:')).toBe(5);
    // The URL and the response body are what the run produces, so the space ships no documents.
    expect(countOf('type.document')).toBe(0);
  });

  // Falsifiable without hardcoding the archive's contents: every typename in the archive must be one
  // the definition DECLARED. The zero-count above would not be — `countOf` substring-matches, so
  // asserting a typename is absent passes just as well when the typename is misspelled.
  test('every schema the content persists is declared', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(WorkerSpace()));
    const declared = new Set(WorkerSpace().schemas.map((schema) => Type.getTypename(schema)));

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
    const tasks = await taskArchive(WorkerSpace());

    expect(tasks.map((task) => task.title)).toEqual([
      'Create a sandbox and install the toolchain',
      'Write the Worker',
      'Deploy it with no Cloudflare login',
      'Fetch the deployed URL and check the response',
      'Claim the temporary Cloudflare account',
    ]);
    expect(tasks.every((task) => task.status === 'todo')).toBe(true);

    // The identity each dependency names, not merely how many there are: a chain wired to the wrong
    // predecessor has the same shape as the right one and would otherwise pass.
    expect(tasks.map((task) => task.dependsOn?.map((ref) => ref['/']))).toEqual([
      undefined,
      ...tasks.slice(0, -1).map((task) => [`echo:///${task.id}`]),
    ]);
  });

  // The one browser step is the reader's, and it is last: an agent with no login cannot update a
  // claimed account, so claiming before the deploy would strand the run.
  test('only the claim is assigned to the reader, and it is last', { timeout: 120_000 }, async ({ expect }) => {
    const tasks = await taskArchive(WorkerSpace());
    const assigned = tasks.filter((task) => task.assignee !== undefined);

    expect(assigned.map((task) => task.title)).toEqual(['Claim the temporary Cloudflare account']);
    // The role is what the row reads as "not the agent's"; a name alone would not say that.
    expect(assigned.map((task) => task.assignee?.role)).toEqual(['user']);
    expect(tasks.at(-1)?.title).toEqual('Claim the temporary Cloudflare account');
  });
});
