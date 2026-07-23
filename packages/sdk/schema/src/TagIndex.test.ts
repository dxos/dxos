//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { Database, DXN, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { EchoTestBuilder, getObjectCore } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { EID, EntityId, SpaceId } from '@dxos/keys';

import * as TagIndex from './TagIndex';

/** A minimal item standing in for an immutable feed object. */
const Item = Type.makeObject(DXN.make('org.dxos.test.tagindex.Item', '0.1.0'))(
  Schema.Struct({
    text: Schema.String,
  }),
);

/** A host pairing an immutable feed of items with a referenced tag index over them. */
const Host = Type.makeObject(DXN.make('org.dxos.test.tagindex.Host', '0.1.0'))(
  Schema.Struct({
    feed: Ref.Ref(Feed.Feed),
    tags: Ref.Ref(TagIndex.TagIndex),
  }),
);

describe('TagIndex', () => {
  test('sets, unsets, and inverts feed-object tags', () => {
    const tagIndex = TagIndex.make();
    const tags = TagIndex.bind(tagIndex);

    const a = Obj.make(Item, { text: 'a' });
    const b = Obj.make(Item, { text: 'b' });
    const urgent = 'dxn:tag:urgent';
    const later = 'dxn:tag:later';

    tags.setTag(urgent, a.id);
    tags.setTag(urgent, b.id);
    tags.setTag(later, b.id);
    // Idempotent.
    tags.setTag(urgent, a.id);

    // Filter the feed by tag: tag -> object ids.
    expect([...tags.objects(urgent)]).toEqual([a.id, b.id]);
    expect([...tags.objects(later)]).toEqual([b.id]);
    expect([...tags.objects('dxn:tag:missing')]).toEqual([]);

    // Inverse: object -> tag ids.
    expect(tags.tags(b.id).sort()).toEqual([later, urgent]);
    expect(tags.tags(a.id)).toEqual([urgent]);
    expect(tags.tagIds().sort()).toEqual([later, urgent]);

    // Unset prunes the membership; emptying a tag drops the key.
    tags.unsetTag(urgent, a.id);
    expect([...tags.objects(urgent)]).toEqual([b.id]);
    tags.unsetTag(urgent, b.id);
    expect([...tags.objects(urgent)]).toEqual([]);
    expect(tags.tagIds()).toEqual([later]);
  });

  test('matches tag membership across absolute and relative key forms (import round-trips)', () => {
    const tagIndex = TagIndex.make();
    const tags = TagIndex.bind(tagIndex);

    const entityId = EntityId.random();
    const item = EntityId.random();
    const absolute = EID.make({ spaceId: SpaceId.random(), entityId }); // How live data stores a tag id.
    const relative = EID.make({ entityId }); // How a portable snapshot stores it (no space id).

    // A tag stored under its absolute uri is found by the relative query and vice versa: membership
    // ignores the space id, so a space import (which mints a new space id) keeps tags resolvable.
    tags.setTag(absolute, item);
    expect([...tags.objects(relative)]).toEqual([item]);
    expect([...tags.objects(absolute)]).toEqual([item]);
    // Same entity id under a different space also matches (the post-import resolution case).
    expect([...tags.objects(EID.make({ spaceId: SpaceId.random(), entityId }))]).toEqual([item]);

    // Non-EID tag ids are still compared verbatim.
    tags.setTag('dxn:tag:urgent', item);
    expect([...tags.objects('dxn:tag:urgent')]).toEqual([item]);
    expect([...tags.objects('dxn:tag:other')]).toEqual([]);
  });

  test('atom family returns tag uris for one object', () => {
    const tagIndex = TagIndex.make();
    const tags = TagIndex.bind(tagIndex);

    const first = EntityId.random();
    const second = EntityId.random();
    const urgent = 'dxn:tag:urgent';
    const later = 'dxn:tag:later';

    tags.setTag(urgent, first);
    tags.setTag(later, first);
    tags.setTag(urgent, second);

    const tagsForObject = TagIndex.atom(tagIndex);
    const registry = Registry.make();
    expect(registry.get(tagsForObject(first)).sort()).toEqual([later, urgent]);
    expect(registry.get(tagsForObject(second))).toEqual([urgent]);

    tags.unsetTag(later, first);
    expect(registry.get(tagsForObject(first))).toEqual([urgent]);
  });

  test('taggedIdsAtom returns object ids for one tag', ({ expect }) => {
    const tagIndex = TagIndex.make();
    const tags = TagIndex.bind(tagIndex);

    const first = EntityId.random();
    const second = EntityId.random();
    const urgent = 'dxn:tag:urgent';
    const later = 'dxn:tag:later';

    tags.setTag(urgent, first);
    tags.setTag(urgent, second);
    tags.setTag(later, first);

    const registry = Registry.make();
    expect(registry.get(TagIndex.taggedIdsAtom(tagIndex, urgent))).toEqual([first, second]);
    expect(registry.get(TagIndex.taggedIdsAtom(tagIndex, later))).toEqual([first]);
    expect(registry.get(TagIndex.taggedIdsAtom(tagIndex, 'dxn:tag:missing'))).toEqual([]);

    tags.unsetTag(urgent, first);
    expect(registry.get(TagIndex.taggedIdsAtom(tagIndex, urgent))).toEqual([second]);
  });
});

describe('TagIndex (feed integration)', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // Regression for DX-984: setTag/unsetTag must use push/splice (in-place), not spread-replace.
  // Spread-replace causes O(n) Automerge ops per call → O(n²) total → multi-MiB documents.
  test('setTag emits O(1) Automerge ops per append', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TagIndex.TagIndex] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const tagIndex = yield* Database.add(TagIndex.make());
      yield* Database.flush();

      const tags = TagIndex.bind(tagIndex);
      const core = getObjectCore(tagIndex);
      const urgent = 'dxn:tag:urgent';
      const N = 200;

      const opsBefore = A.stats(core.getDoc()).numOps;
      for (let i = 0; i < N; i++) {
        tags.setTag(urgent, EntityId.random());
      }
      const totalOps = A.stats(core.getDoc()).numOps - opsBefore;

      // push() → O(1) ops/call. Each ULID (~26 chars) costs ~27 Automerge ops when stored as text,
      // so totalOps ≈ N * 27 ≈ 5,400.
      // spread-replace → O(n) ops/call → totalOps ≈ N²/2 * 27 ≈ 540,000 for N=200.
      expect(totalOps).toBeLessThan(N * 50);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('unsetTag emits O(1) Automerge ops per removal', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [TagIndex.TagIndex] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const tagIndex = yield* Database.add(TagIndex.make());
      yield* Database.flush();

      const tags = TagIndex.bind(tagIndex);
      const core = getObjectCore(tagIndex);
      const urgent = 'dxn:tag:urgent';
      const N = 200;
      const ids = Array.from({ length: N }, () => EntityId.random());

      for (const id of ids) {
        tags.setTag(urgent, id);
      }

      const opsBefore = A.stats(core.getDoc()).numOps;
      for (const id of ids) {
        tags.unsetTag(urgent, id);
      }
      const totalOps = A.stats(core.getDoc()).numOps - opsBefore;

      // splice() → O(1) ops/call → totalOps ≈ N.
      // filter-replace → O(n) ops/call → totalOps ≈ N²/2 ≈ 20,000 for N=200.
      expect(totalOps).toBeLessThan(N * 5);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });

  test('tags immutable feed objects and filters the feed by tag', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Feed.Feed, Item, Host, TagIndex.TagIndex] });
    const db = await peer.createDatabase();
    const testLayer = Database.layer(db);

    await Effect.gen(function* () {
      const feed = yield* Database.add(Feed.make());
      const tagIndex = yield* Database.add(TagIndex.make());
      const host = yield* Database.add(Obj.make(Host, { feed: Ref.make(feed), tags: Ref.make(tagIndex) }));
      Obj.setParent(feed, host);
      Obj.setParent(tagIndex, host);
      yield* Database.flush();

      // Append immutable items to the feed.
      const hello = Obj.make(Item, { text: 'hello' });
      const world = Obj.make(Item, { text: 'world' });
      yield* Feed.append(feed, [hello, world]);

      // Tag feed objects by their ids (tag ids reference existing Tag objects/URIs).
      const urgent = 'echo:/urgent';
      const tags = TagIndex.bind(tagIndex);
      tags.setTag(urgent, hello.id);

      // Persisted across a round-trip read (arrays stored as arrays, not numeric-keyed objects).
      expect([...tags.objects(urgent)]).toEqual([hello.id]);
      expect(tags.tags(hello.id)).toEqual([urgent]);

      // Filter the feed by tag.
      const items = yield* Feed.query(feed, Filter.type(Item)).run;
      const tagged = new Set(tags.objects(urgent));
      expect(items.filter((item) => tagged.has(item.id)).map((item) => item.text)).toEqual(['hello']);

      // Unset removes the association and prunes the empty tag.
      tags.unsetTag(urgent, hello.id);
      expect([...tags.objects(urgent)]).toEqual([]);
      expect(tags.tagIds()).toEqual([]);
    }).pipe(Effect.provide(testLayer), EffectEx.runAndForwardErrors);
  });
});
