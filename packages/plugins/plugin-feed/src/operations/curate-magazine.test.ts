//
// Copyright 2026 DXOS.org
//

import { beforeEach, afterEach, describe, expect, test } from 'vitest';

import { Feed, Obj, Ref, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { StateMap, TagIndex, Text } from '@dxos/schema';

import { Magazine, Subscription } from '../types';
import { applyKeep, resolveSelected } from './curate-magazine';

describe('applyKeep', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db } = await builder.createDatabase({
      types: [
        Feed.Feed,
        Subscription.Subscription,
        Subscription.Post,
        Magazine.Magazine,
        Tag.Tag,
        Text.Text,
        StateMap.StateMap,
        TagIndex.TagIndex,
      ],
    });
    return { db };
  };

  const makePost = (published: string): Subscription.Post =>
    Obj.make(Subscription.Post, { title: `Post ${published}`, description: 'body', published });

  test('keeps the newest posts up to the bound', async () => {
    const { db } = await setup();
    const posts = ['2026-01-01', '2026-01-02', '2026-01-03'].map((date) =>
      Ref.make(db.add(makePost(`${date}T00:00:00Z`))),
    );

    const kept = applyKeep(posts, 2, undefined);
    const keptDates = kept.map((ref) => ref.target?.published);
    expect(kept).toHaveLength(2);
    expect(keptDates).toContain('2026-01-03T00:00:00Z');
    expect(keptDates).toContain('2026-01-02T00:00:00Z');
    expect(keptDates).not.toContain('2026-01-01T00:00:00Z');
  });

  test('no-ops when within the bound', async () => {
    const { db } = await setup();
    const posts = ['2026-01-01', '2026-01-02'].map((date) => Ref.make(db.add(makePost(`${date}T00:00:00Z`))));
    expect(applyKeep(posts, 10, undefined)).toHaveLength(2);
  });
});

describe('resolveSelected', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('maps ids to posts in order, dropping unknown and duplicate ids', async () => {
    const { db } = await builder.createDatabase({ types: [Subscription.Post] });
    const posts = ['a', 'b', 'c'].map((title) => db.add(Obj.make(Subscription.Post, { title })));
    await db.flush();
    const candidates = posts.map((post) => ({ post }));

    const selected = resolveSelected(candidates, [
      { id: posts[2].id },
      { id: 'missing-id' },
      { id: posts[0].id },
      { id: posts[2].id },
    ]);

    expect(selected.map(({ post }) => post.id)).toEqual([posts[2].id, posts[0].id]);
  });
});
