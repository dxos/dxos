//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Data from 'effect/Data';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Feed, Obj, Ref, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';

import { Magazine, Subscription } from '../types';
import { postCurationAtom } from './post-curation';
import { postDisplayAtom } from './post-display';
import { postReadAtom } from './post-read';
import { postTagsAtom } from './post-tags';

describe('postReadAtom', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('fires when this post is marked read', async () => {
    const { db } = await builder.createDatabase({ types: [Tag.Tag, Subscription.Subscription, Subscription.Post] });
    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com' }));
    const post = db.add(Obj.make(Subscription.Post, { source: Ref.make(subscription) }));
    await db.flush();

    const registry = Registry.make();
    const atom = postReadAtom(post);
    let fireCount = 0;
    registry.subscribe(atom, () => fireCount++, { immediate: true });
    expect(fireCount).toBe(1);

    Subscription.setReadAt(subscription, post.id, new Date().toISOString());
    await db.flush();
    expect(fireCount).toBe(2);
    expect(registry.get(atom).readAt).toBeDefined();
  });

  test('does not fire when a sibling post is marked read', async () => {
    const { db } = await builder.createDatabase({ types: [Tag.Tag, Subscription.Subscription, Subscription.Post] });
    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com' }));
    const postA = db.add(Obj.make(Subscription.Post, { source: Ref.make(subscription) }));
    const postB = db.add(Obj.make(Subscription.Post, { source: Ref.make(subscription) }));
    await db.flush();

    const registry = Registry.make();
    const atomA = postReadAtom(postA);
    let fireCount = 0;
    registry.subscribe(atomA, () => fireCount++, { immediate: true });
    expect(fireCount).toBe(1);

    Subscription.setReadAt(subscription, postB.id, new Date().toISOString());
    await db.flush();
    expect(fireCount).toBe(1); // postA's readAt unchanged — should not re-fire.
  });

  test('does not fire when an unrelated subscription field changes', async () => {
    const { db } = await builder.createDatabase({ types: [Tag.Tag, Subscription.Subscription, Subscription.Post] });
    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com' }));
    const post = db.add(Obj.make(Subscription.Post, { source: Ref.make(subscription) }));
    await db.flush();

    const registry = Registry.make();
    const atom = postReadAtom(post);
    let fireCount = 0;
    registry.subscribe(atom, () => fireCount++, { immediate: true });
    expect(fireCount).toBe(1);

    Obj.update(subscription, (subscription) => {
      subscription.name = 'Updated';
    });
    await db.flush();
    expect(fireCount).toBe(1); // name change — should not re-fire.
  });
});

describe('postTagsAtom', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('fires when this post is starred', async () => {
    const { db } = await builder.createDatabase({ types: [Tag.Tag, Subscription.Subscription, Subscription.Post] });
    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com' }));
    const post = db.add(Obj.make(Subscription.Post, { source: Ref.make(subscription) }));
    await db.flush();

    const registry = Registry.make();
    const atom = postTagsAtom(post);
    let fireCount = 0;
    registry.subscribe(atom, () => fireCount++, { immediate: true });
    expect(fireCount).toBe(1);
    expect(registry.get(atom).starred).toBe(false);

    await Subscription.setTag(subscription, post.id, db, 'starred', true);
    await db.flush();
    // tagUrisAtom fires once when Tag.Tag is created (intermediate re-run, still starred=false),
    // then Obj.subscribe fires when subscription.tags is mutated (starred=true, setSelf).
    expect(fireCount).toBe(3);
    expect(registry.get(atom).starred).toBe(true);
  });

  test('does not fire when a sibling post is starred (after tag warm-up)', async () => {
    const { db } = await builder.createDatabase({ types: [Tag.Tag, Subscription.Subscription, Subscription.Post] });
    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com' }));
    const postA = db.add(Obj.make(Subscription.Post, { source: Ref.make(subscription) }));
    const postB = db.add(Obj.make(Subscription.Post, { source: Ref.make(subscription) }));
    // Pre-warm the Tag.Tag so tagUrisAtom is already populated when the atom subscribes.
    // Without this, the first setTag creates Tag.Tag → tagUrisAtom fires → one extra body re-run.
    await Subscription.setTag(subscription, postA.id, db, 'starred', true);
    await Subscription.setTag(subscription, postA.id, db, 'starred', false);
    await db.flush();

    const registry = Registry.make();
    const atomA = postTagsAtom(postA);
    let fireCount = 0;
    registry.subscribe(atomA, () => fireCount++, { immediate: true });
    expect(fireCount).toBe(1);

    await Subscription.setTag(subscription, postB.id, db, 'starred', true);
    await db.flush();
    expect(fireCount).toBe(1); // postA's tags unchanged — should not re-fire.
  });
});

describe('postCurationAtom', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('fires when this post gets a curated snippet', async () => {
    const { db } = await builder.createDatabase({
      types: [Tag.Tag, Feed.Feed, Subscription.Subscription, Subscription.Post, Magazine.Magazine],
    });
    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com' }));
    const post = db.add(Obj.make(Subscription.Post, { source: Ref.make(subscription) }));
    const magazine = db.add(Magazine.make({ feeds: [Ref.make(subscription)] }));
    await db.flush();

    const registry = Registry.make();
    const atom = postCurationAtom(Data.tuple(post, magazine));
    let fireCount = 0;
    registry.subscribe(atom, () => fireCount++, { immediate: true });
    expect(fireCount).toBe(1);
    expect(registry.get(atom).snippet).toBeUndefined();

    Magazine.patchPostState(magazine, post.id, { snippet: 'A great article about AI.' });
    await db.flush();
    expect(fireCount).toBe(2);
    expect(registry.get(atom).snippet).toBe('A great article about AI.');
  });

  test('does not fire when a sibling post gets a snippet', async () => {
    const { db } = await builder.createDatabase({
      types: [Tag.Tag, Feed.Feed, Subscription.Subscription, Subscription.Post, Magazine.Magazine],
    });
    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com' }));
    const postA = db.add(Obj.make(Subscription.Post, { source: Ref.make(subscription) }));
    const postB = db.add(Obj.make(Subscription.Post, { source: Ref.make(subscription) }));
    const magazine = db.add(Magazine.make({ feeds: [Ref.make(subscription)] }));
    await db.flush();

    const registry = Registry.make();
    const atomA = postCurationAtom(Data.tuple(postA, magazine));
    let fireCount = 0;
    registry.subscribe(atomA, () => fireCount++, { immediate: true });
    expect(fireCount).toBe(1);

    Magazine.patchPostState(magazine, postB.id, { snippet: 'Sibling snippet.' });
    await db.flush();
    expect(fireCount).toBe(1); // postA's curation unchanged — should not re-fire.
  });

  test('does not fire when an unrelated magazine field changes', async () => {
    const { db } = await builder.createDatabase({
      types: [Tag.Tag, Feed.Feed, Subscription.Subscription, Subscription.Post, Magazine.Magazine],
    });
    const subscription = db.add(Subscription.makeSubscription({ name: 'Test', url: 'https://example.com' }));
    const post = db.add(Obj.make(Subscription.Post, { source: Ref.make(subscription) }));
    const magazine = db.add(Magazine.make({ feeds: [Ref.make(subscription)] }));
    await db.flush();

    const registry = Registry.make();
    const atom = postCurationAtom(Data.tuple(post, magazine));
    let fireCount = 0;
    registry.subscribe(atom, () => fireCount++, { immediate: true });
    expect(fireCount).toBe(1);

    Obj.update(magazine, (magazine) => {
      magazine.name = 'Updated Magazine';
    });
    await db.flush();
    expect(fireCount).toBe(1); // name change — should not re-fire.
  });
});

describe('postDisplayAtom', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('prefers agent snippet over RSS description', async () => {
    const { db } = await builder.createDatabase({
      types: [Tag.Tag, Feed.Feed, Subscription.Subscription, Subscription.Post, Magazine.Magazine],
    });
    const subscription = db.add(Subscription.makeSubscription({ name: 'Feed', url: 'https://example.com' }));
    const post = db.add(
      Obj.make(Subscription.Post, { source: Ref.make(subscription), description: 'RSS description.' }),
    );
    const magazine = db.add(Magazine.make({ feeds: [Ref.make(subscription)], posts: [Ref.make(post)] }));
    await db.flush();

    const registry = Registry.make();
    const atom = postDisplayAtom(Data.tuple(post, magazine));
    registry.subscribe(atom, () => {}, { immediate: true });

    // Before curation: falls back to RSS description.
    expect(registry.get(atom).snippet).toContain('RSS description');

    Magazine.patchPostState(magazine, post.id, { snippet: 'Agent snippet.' });
    await db.flush();

    expect(registry.get(atom).snippet).toBe('Agent snippet.');
  });

  test('fires on read state change', async () => {
    const { db } = await builder.createDatabase({
      types: [Tag.Tag, Feed.Feed, Subscription.Subscription, Subscription.Post, Magazine.Magazine],
    });
    const subscription = db.add(Subscription.makeSubscription({ name: 'Feed', url: 'https://example.com' }));
    const post = db.add(Obj.make(Subscription.Post, { source: Ref.make(subscription) }));
    const magazine = db.add(Magazine.make({ feeds: [Ref.make(subscription)], posts: [Ref.make(post)] }));
    await db.flush();

    const registry = Registry.make();
    const atom = postDisplayAtom(Data.tuple(post, magazine));
    let fireCount = 0;
    registry.subscribe(atom, () => fireCount++, { immediate: true });
    expect(registry.get(atom).read).toBe(false);

    Subscription.setReadAt(subscription, post.id, new Date().toISOString());
    await db.flush();
    expect(registry.get(atom).read).toBe(true);
    expect(fireCount).toBe(2);
  });
});
