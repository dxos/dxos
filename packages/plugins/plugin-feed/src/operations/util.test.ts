//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Obj, Tag } from '@dxos/echo';

import { Subscription } from '../types';
import { partitionByKeepBound } from './util';

const makePost = (props: { title: string; published?: string; starred?: boolean; starDxn?: string }): Subscription.Post => {
  const post = Obj.make(Subscription.Post, { title: props.title, published: props.published });
  if (props.starred && props.starDxn) {
    Obj.change(post, (post) => {
      Obj.getMeta(post).tags = [props.starDxn!];
    });
  }
  return post;
};

describe('partitionByKeepBound', () => {
  test('keeps the newest N non-starred posts and drops the rest', () => {
    const posts = [
      makePost({ title: 'A', published: '2026-04-01T00:00:00Z' }),
      makePost({ title: 'B', published: '2026-04-02T00:00:00Z' }),
      makePost({ title: 'C', published: '2026-04-03T00:00:00Z' }),
      makePost({ title: 'D', published: '2026-04-04T00:00:00Z' }),
      makePost({ title: 'E', published: '2026-04-05T00:00:00Z' }),
    ];
    const { kept, dropped } = partitionByKeepBound(posts, 2, undefined);
    // Keep newest two (E, D); drop the older three.
    expect(kept.map((post) => post.title).sort()).toEqual(['D', 'E']);
    expect(dropped.map((post) => post.title).sort()).toEqual(['A', 'B', 'C']);
  });

  test('preserves starred posts beyond the keep bound', () => {
    const starTag = Obj.make(Tag.Tag, { label: Subscription.STAR_TAG });
    const starDxn = Obj.getDXN(starTag).toString();
    const posts = [
      makePost({ title: 'A-old-starred', published: '2026-04-01T00:00:00Z', starred: true, starDxn }),
      makePost({ title: 'B', published: '2026-04-02T00:00:00Z' }),
      makePost({ title: 'C', published: '2026-04-03T00:00:00Z' }),
      makePost({ title: 'D', published: '2026-04-04T00:00:00Z' }),
      makePost({ title: 'E', published: '2026-04-05T00:00:00Z' }),
    ];
    const { kept, dropped } = partitionByKeepBound(posts, 2, starTag);
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
    const { kept, dropped } = partitionByKeepBound(posts, 1, undefined);
    // Only the newest dated post is kept; the undated post sorts to the bottom.
    expect(kept.map((post) => post.title)).toEqual(['C']);
    expect(dropped.map((post) => post.title).sort()).toEqual(['A', 'B']);
  });

  test('keep bound of 0 drops all non-starred posts', () => {
    const starTag = Obj.make(Tag.Tag, { label: Subscription.STAR_TAG });
    const starDxn = Obj.getDXN(starTag).toString();
    const posts = [
      makePost({ title: 'A', published: '2026-04-01T00:00:00Z' }),
      makePost({ title: 'B-starred', published: '2026-04-02T00:00:00Z', starred: true, starDxn }),
    ];
    const { kept, dropped } = partitionByKeepBound(posts, 0, starTag);
    expect(kept.map((post) => post.title)).toEqual(['B-starred']);
    expect(dropped.map((post) => post.title)).toEqual(['A']);
  });
});
