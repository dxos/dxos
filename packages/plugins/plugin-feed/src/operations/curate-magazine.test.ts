//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Feed as EchoFeed, Obj, Ref, Tag } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { invariant } from '@dxos/invariant';
import { Text } from '@dxos/schema';

import { Magazine, Subscription } from '../types';
import { curateMagazine } from './curate-magazine';

/**
 * Headless tests for {@link curateMagazine}.
 *
 * These mirror the user-visible Curate flow against a real ECHO database +
 * queue stack, no UI. Verifies that:
 *  - Posts in a feed's queue are appended to `magazine.posts`.
 *  - Re-running curate is idempotent: second invocation adds 0, doesn't throw.
 *
 * Repros the `addCore` invariant ("`!this._objects.has(core.id)`") that
 * surfaced in the live app — the underlying queue/db ref lifecycle is the
 * same here as in production, so any regression in that path will trip the
 * invariant in this test before reaching the user.
 */
describe('curateMagazine', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, queues } = await builder.createDatabase({
      types: [EchoFeed.Feed, Subscription.Feed, Subscription.Post, Magazine.Magazine, Tag.Tag, Text.Text],
    });

    const subscriptionFeed = db.add(Subscription.makeFeed({ name: 'test feed', url: 'https://example.com/rss' }));
    const magazine = db.add(Magazine.make({ feeds: [Ref.make(subscriptionFeed)] }));
    await db.flush();

    const echoFeed = subscriptionFeed.feed?.target;
    invariant(echoFeed, 'Backing ECHO feed should be present.');
    const feedDxn = EchoFeed.getQueueDxn(echoFeed);
    invariant(feedDxn, 'Feed should have a queue DXN.');
    const queue = queues.get(feedDxn);

    return { db, queues, magazine, subscriptionFeed, queue };
  };

  const makePost = (props: { title: string; description: string; published: string; guid?: string }) =>
    Obj.make(Subscription.Post, {
      title: props.title,
      description: props.description,
      published: props.published,
      guid: props.guid ?? props.title,
    });

  test('appends queue posts to the magazine', async () => {
    const { db, magazine, queue, queues } = await setup();
    await queue.append([
      makePost({ title: 'A', description: 'first body', published: '2026-04-01T00:00:00Z' }),
      makePost({ title: 'B', description: 'second body', published: '2026-04-02T00:00:00Z' }),
    ]);

    const result = await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(result.added).toBe(2);
    expect(magazine.posts.length).toBe(2);
  });

  test('re-running curate is idempotent (no addCore invariant violation)', async () => {
    const { db, magazine, queue, queues } = await setup();
    await queue.append([
      makePost({ title: 'A', description: 'first body', published: '2026-04-01T00:00:00Z' }),
      makePost({ title: 'B', description: 'second body', published: '2026-04-02T00:00:00Z' }),
    ]);

    const first = await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(first.added).toBe(2);
    expect(magazine.posts.length).toBe(2);

    // Second invocation: should not throw `addCore` invariant, should add 0.
    const second = await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(second.added).toBe(0);
    expect(magazine.posts.length).toBe(2);
  });

  test('skips posts with empty descriptions', async () => {
    const { db, magazine, queue, queues } = await setup();
    await queue.append([
      makePost({ title: 'A', description: 'has body', published: '2026-04-01T00:00:00Z' }),
      makePost({ title: 'B', description: '', published: '2026-04-02T00:00:00Z' }),
    ]);

    const result = await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(result.added).toBe(1);
    expect(magazine.posts.length).toBe(1);
  });

  test('does not throw addCore invariant after queue.delete prunes earlier-curated posts', async () => {
    // Repros the exact accumulated-state shape that surfaces in the live app
    // when an earlier code path had `queue.delete()` enabled: a Post object is
    // first added to space.db (via curate's `Ref.make` + array assignment),
    // then later removed from the queue. On the next curate, the deep-mapper
    // walks `magazine.posts` and may try to re-register the same Post via
    // `createRef` → `database.add` → `addCore`, hitting the
    // `!this._objects.has(core.id)` invariant. This test guards against that
    // regression: even after a queue.delete, subsequent curate must not throw.
    const { db, magazine, queue, queues } = await setup();
    await queue.append([
      makePost({ title: 'A', description: 'a body', published: '2026-04-01T00:00:00Z' }),
      makePost({ title: 'B', description: 'b body', published: '2026-04-02T00:00:00Z' }),
      makePost({ title: 'C', description: 'c body', published: '2026-04-03T00:00:00Z' }),
    ]);

    // First curate — all three posts now in space.db (via createRef) and in
    // magazine.posts.
    await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(magazine.posts.length).toBe(3);

    // Capture the queue items so we can pull their ids; must do it BEFORE
    // queue.delete clears `_objectCache`.
    const items = (await queue.queryObjects()) ?? [];
    const oldestTwo = items.slice(0, 2).map((item: any) => item.id as string);

    // Drop the two oldest posts from the queue. Their `Post` objects remain
    // in space.db (referenced by magazine.posts) but the queue's
    // `_objectCache` entry is gone — fresh `queryObjects()` calls will
    // reconstruct proxies whose `_internals.database` link is unset.
    await queue.delete(oldestTwo);

    // Second curate — must complete without throwing the invariant.
    await expect(curateMagazine(magazine, db, (dxn) => queues.get(dxn))).resolves.toBeDefined();
  });

  test('handles three sequential curate cycles with new posts each time', async () => {
    // Mirrors a user repeatedly clicking Curate as a feed gains new items.
    const { db, magazine, queue, queues } = await setup();

    await queue.append([makePost({ title: 'A', description: 'a body', published: '2026-04-01T00:00:00Z' })]);
    let result = await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(result.added).toBe(1);
    expect(magazine.posts.length).toBe(1);

    await queue.append([makePost({ title: 'B', description: 'b body', published: '2026-04-02T00:00:00Z' })]);
    result = await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(result.added).toBe(1);
    expect(magazine.posts.length).toBe(2);

    await queue.append([makePost({ title: 'C', description: 'c body', published: '2026-04-03T00:00:00Z' })]);
    result = await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(result.added).toBe(1);
    expect(magazine.posts.length).toBe(3);
  });

  test('regression: re-curate with persisted refs survives DXN form mismatch', async () => {
    // The bug behind the user-reported `addCore` invariant violation: when a
    // Post is added to magazine.posts via `Ref.make`, the persisted ref's DXN
    // is in local-id form (`dxn:echo:@:<id>`), but a Post read fresh from the
    // queue via `queue.queryObjects()` carries a queue-scoped `SelfDXNId`
    // (`dxn:queue:<spaceId>:<queueId>:<id>`). String-comparing the two forms
    // makes dedup fail, so subsequent curates re-process the post — call
    // `Ref.make` on the fresh queue proxy (with a fresh `core`) — and ECHO's
    // deep-mapper invokes `database.add` on a core whose id is already
    // present in `_objects` (from the first curate's add), tripping the
    // `!_objects.has(core.id)` invariant.
    //
    // Verify the fix dedups by the bare object id (last DXN segment) so the
    // mismatch doesn't matter.
    const { db, magazine, queue, queues } = await setup();
    await queue.append([makePost({ title: 'A', description: 'first body', published: '2026-04-01T00:00:00Z' })]);

    const first = await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(first.added).toBe(1);

    // Confirm the DXN form mismatch is real (so this test is exercising the
    // condition the fix targets, not a coincidence).
    const magDxn = magazine.posts[0].dxn.toString();
    const items = (await queue.queryObjects()) ?? [];
    const queueDxn = Obj.getDXN(items[0] as any).toString();
    expect(magDxn).not.toBe(queueDxn);

    // Second curate must not throw the addCore invariant and must add 0.
    await expect(curateMagazine(magazine, db, (dxn) => queues.get(dxn))).resolves.toEqual({ added: 0 });
    expect(magazine.posts.length).toBe(1);
  });

  test('regression: curate after Clear (magazine emptied while space.db still has posts)', async () => {
    // The user-reported scenario, played back deterministically:
    //   1. Curate adds queue posts to magazine.posts. Each post is also added
    //      to space.db (via `createRef` → `database.add`).
    //   2. Clear empties magazine.posts. Space.db still tracks the posts.
    //   3. Curate again. The queue still holds the same items, but
    //      `queue.queryObjects()` decodes each one fresh from JSON — yielding a
    //      proxy whose `_internals.database` is unset, even though the bare
    //      object id is already in `space.db._objects` from step 1.
    //   4. Outer dedup misses (magazine.posts is empty post-Clear), so each
    //      post goes back into `added`. The inner write
    //      `mutable.posts = [...empty, ...fresh]` runs the deep-mapper, which
    //      calls `createRef` → `database.add` → `addCore` → invariant
    //      `!_objects.has(core.id)` fires.
    const { db, magazine, queue, queues } = await setup();
    await queue.append([
      makePost({ title: 'A', description: 'a body', published: '2026-04-01T00:00:00Z' }),
      makePost({ title: 'B', description: 'b body', published: '2026-04-02T00:00:00Z' }),
    ]);

    const first = await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(first.added).toBe(2);
    expect(magazine.posts.length).toBe(2);

    // Simulate Clear: empty magazine.posts. The Post objects remain in
    // space.db (added during first curate via createRef).
    Obj.change(magazine, (magazine) => {
      const mutable = magazine as Obj.Mutable<typeof magazine>;
      mutable.posts = [];
    });
    expect(magazine.posts.length).toBe(0);

    // Re-curate. With the fix, this must NOT throw the addCore invariant —
    // it should detect the posts are already in space.db (by id) and reuse
    // them rather than re-adding via createRef.
    const second = await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(second.added).toBe(2);
    expect(magazine.posts.length).toBe(2);
  });

  test('handles new posts arriving after some queue items were deleted', async () => {
    // Simulates a sync that prunes old queue items, then a follow-up sync
    // that appends new ones. This is the most invariant-prone shape:
    // `magazine.posts` contains refs to deleted Post objects (still in
    // `space.db` from the first curate), and the deep-mapper walks them
    // alongside fresh refs to brand-new posts.
    const { db, magazine, queue, queues } = await setup();
    await queue.append([
      makePost({ title: 'A', description: 'a body', published: '2026-04-01T00:00:00Z' }),
      makePost({ title: 'B', description: 'b body', published: '2026-04-02T00:00:00Z' }),
    ]);
    await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(magazine.posts.length).toBe(2);

    // Drop the older one from the queue (the Post stays in space.db,
    // referenced by magazine.posts).
    const items = (await queue.queryObjects()) ?? [];
    const oldest = items.slice(0, 1).map((item: any) => item.id as string);
    await queue.delete(oldest);

    // Append a brand-new post and curate again.
    await queue.append([makePost({ title: 'C', description: 'c body', published: '2026-04-03T00:00:00Z' })]);
    const result = await curateMagazine(magazine, db, (dxn) => queues.get(dxn));
    expect(result.added).toBe(1);
    expect(magazine.posts.length).toBe(3);
  });
});
