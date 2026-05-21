//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';

import { Subscription } from '../types';
import { partitionByKeepBound } from './util';

const makePost = (props: { title: string; published?: string }): Subscription.Post =>
  Obj.make(Subscription.Post, { title: props.title, published: props.published });

describe('partitionByKeepBound', () => {
  test('keeps the newest N non-starred posts and drops the rest', () => {
    const posts = [
      makePost({ title: 'A', published: '2026-04-01T00:00:00Z' }),
      makePost({ title: 'B', published: '2026-04-02T00:00:00Z' }),
      makePost({ title: 'C', published: '2026-04-03T00:00:00Z' }),
      makePost({ title: 'D', published: '2026-04-04T00:00:00Z' }),
      makePost({ title: 'E', published: '2026-04-05T00:00:00Z' }),
    ];
    const { kept, dropped } = partitionByKeepBound(posts, 2, () => false);
    // Keep newest two (E, D); drop the older three.
    expect(kept.map((post) => post.title).sort()).toEqual(['D', 'E']);
    expect(dropped.map((post) => post.title).sort()).toEqual(['A', 'B', 'C']);
  });

  test('preserves starred posts beyond the keep bound', () => {
    const posts = [
      makePost({ title: 'A-old-starred', published: '2026-04-01T00:00:00Z' }),
      makePost({ title: 'B', published: '2026-04-02T00:00:00Z' }),
      makePost({ title: 'C', published: '2026-04-03T00:00:00Z' }),
      makePost({ title: 'D', published: '2026-04-04T00:00:00Z' }),
      makePost({ title: 'E', published: '2026-04-05T00:00:00Z' }),
    ];
    const isStarred = (post: Subscription.Post) => post.title === 'A-old-starred';
    const { kept, dropped } = partitionByKeepBound(posts, 2, isStarred);
    // Starred A always kept; newest non-starred E and D fill the bound; B and C dropped.
    expect(kept.map((post) => post.title).sort()).toEqual(['A-old-starred', 'D', 'E']);
    expect(dropped.map((post) => post.title).sort()).toEqual(['B', 'C']);
  });

  test('falls back gracefully when posts have no published date', () => {
    const posts = [
      makePost({ title: 'A' }),
      makePost({ title: 'B', published: '2026-04-02T00:00:00Z' }),
      makePost({ title: 'C', published: '2026-04-03T00:00:00Z' }),
    ];
    const { kept, dropped } = partitionByKeepBound(posts, 1, () => false);
    // Only the newest dated post is kept; the undated post sorts to the bottom.
    expect(kept.map((post) => post.title)).toEqual(['C']);
    expect(dropped.map((post) => post.title).sort()).toEqual(['A', 'B']);
  });

  test('keep bound of 0 drops all non-starred posts', () => {
    const posts = [
      makePost({ title: 'A', published: '2026-04-01T00:00:00Z' }),
      makePost({ title: 'B-starred', published: '2026-04-02T00:00:00Z' }),
    ];
    const isStarred = (post: Subscription.Post) => post.title === 'B-starred';
    const { kept, dropped } = partitionByKeepBound(posts, 0, isStarred);
    expect(kept.map((post) => post.title)).toEqual(['B-starred']);
    expect(dropped.map((post) => post.title)).toEqual(['A']);
  });
});
