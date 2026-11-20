//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as CommunitySpace from './CommunitySpace.ts';

/** An archived object, with the fields these checks read; refs serialize as `{ '/': 'echo:///<id>' }`. */
type Archived = {
  '@type'?: string;
  'id': string;
  'title'?: string;
  'status'?: string;
  'dependsOn'?: Array<{ '/': string }>;
  'artifacts'?: Array<{ '/': string }>;
};

/**
 * Built on demand rather than committed, so this asserts the shape in place of a fixture: if a schema it seeds changes
 * incompatibly, the build fails here.
 */
describe('Cloudflare community template', () => {
  test('builds the project and its six tasks, and no artifacts', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(CommunitySpace.make()));
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(countOf('type.project:')).toBe(1);
    expect(countOf('type.instructions')).toBe(1);
    expect(countOf('type.taskSet')).toBe(1);
    expect(countOf('type.task:')).toBe(6);
    // The artifacts are what the agent makes; the template ships none.
    expect(countOf('type.sheet')).toBe(0);
    expect(countOf('type.document')).toBe(0);
    expect(countOf('type.presentation')).toBe(0);

    const objects: Archived[] = JSON.parse(json).objects;
    const tasks = objects.filter((object) => object['@type']?.includes('type.task:'));
    expect(tasks.map((task) => task.title)).toEqual(
      [
        CommunitySpace.PRODUCTS,
        CommunitySpace.WEEKS,
        CommunitySpace.STACK,
        CommunitySpace.PROBLEMS,
        CommunitySpace.DOCS,
        CommunitySpace.DECK,
      ].map(({ title }) => title),
    );
    expect(tasks.every((task) => task.status === 'todo' && (task.artifacts ?? []).length === 0)).toBe(true);

    // Only the deck waits, and it waits for every analysis.
    const deck = tasks.at(-1);
    const analysisIds = tasks.slice(0, -1).map((task) => task.id);
    expect(deck?.dependsOn?.map((ref) => ref['/'].split('/').at(-1)).sort()).toEqual([...analysisIds].sort());
    expect(tasks.slice(0, -1).every((task) => (task.dependsOn ?? []).length === 0)).toBe(true);
  });
});
