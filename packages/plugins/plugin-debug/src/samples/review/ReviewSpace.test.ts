//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { EffectEx } from '@dxos/effect';

import * as ReviewSpace from './ReviewSpace.ts';

// A 1×1 PNG, so the build needs no network and every image resolves inline.
const PIXEL = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='),
  (char) => char.charCodeAt(0),
);

type ArchiveObject = {
  '@type'?: string;
  'id': string;
  'title'?: string;
  'status'?: string;
  'state'?: string;
  'artifacts'?: unknown[];
  'data'?: { _tag?: string };
};

const build = async (loadAsset: ReviewSpace.Options['loadAsset']) => {
  const { json } = await EffectEx.runPromise(buildArchive(ReviewSpace.make({ loadAsset })));
  const objects: ArchiveObject[] = JSON.parse(json).objects;
  const ofType = (typename: string) => objects.filter((object) => object['@type']?.includes(typename));
  return { json, objects, ofType };
};

/**
 * The template is built on demand rather than committed, so this asserts its shape in place of a
 * fixture: if a schema it seeds changes incompatibly, the build fails here.
 */
describe('Review template', () => {
  test('builds one project with tasks, pull requests and media', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await build(async () => PIXEL);
    const counts = histogram(json);
    const countOf = (typename: string) =>
      Object.entries(counts)
        .filter(([type]) => type.includes(typename))
        .reduce((total, [, count]) => total + count, 0);

    expect(countOf('type.project')).toBe(1);
    expect(countOf('type.taskSet')).toBe(1);
    expect(countOf('type.task:')).toBe(7);
    expect(countOf('type.pullRequest')).toBe(5);
    expect(countOf('type.file')).toBe(4);
    expect(countOf('type.video')).toBe(3);
  });

  test(
    'finished tasks carry merged PRs with media; tasks in review carry open PRs',
    { timeout: 120_000 },
    async ({ expect }) => {
      const { ofType } = await build(async () => PIXEL);
      const refersTo = (task: ArchiveObject, objects: ArchiveObject[]) =>
        objects.filter((object) => JSON.stringify(task.artifacts ?? []).includes(object.id));

      const pullRequests = ofType('type.pullRequest');
      const media = [...ofType('type.file'), ...ofType('type.video')];
      const tasks = ofType('type.task:');

      const done = tasks.filter((task) => task.status === 'done');
      expect(done).toHaveLength(3);
      for (const task of done) {
        expect(refersTo(task, pullRequests).map((pullRequest) => pullRequest.state)).toEqual(['merged']);
        expect(refersTo(task, media).length).toBeGreaterThan(0);
      }

      const review = tasks.filter((task) => task.status === 'review');
      expect(review).toHaveLength(2);
      for (const task of review) {
        expect(refersTo(task, pullRequests).map((pullRequest) => pullRequest.state)).toEqual(['open']);
      }
    },
  );

  test('keeps an unreachable image as an external blob naming its source', { timeout: 120_000 }, async ({ expect }) => {
    const { ofType } = await build(async () => undefined);
    const blobs = ofType('type.blob');
    expect(blobs).toHaveLength(4);
    expect(blobs.every((blob) => blob.data?._tag === 'external')).toBe(true);
  });
});
