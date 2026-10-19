//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { buildArchive, histogram } from '@dxos/app-toolkit/testing';
import { Collection, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import { Magazine, Subscription } from '#types';

import * as ReadingRoomSpace from './ReadingRoomSpace.ts';

type Ref = { readonly '/': string };
type Entry = {
  readonly 'id': string;
  readonly '@type'?: string;
  readonly 'name'?: string;
  readonly 'description'?: string;
  readonly 'published'?: string;
  readonly 'imageUrl'?: string;
  readonly 'source'?: Ref;
  readonly 'objects'?: Ref[];
  readonly 'posts'?: Ref[];
  readonly 'postState'?: Ref;
  readonly 'state'?: Record<string, { readonly rank?: number; snippet?: string; imageUrl?: string; readAt?: string }>;
  readonly 'index'?: Record<string, string[]>;
};
type Archive = { readonly objects: Entry[]; readonly feeds: Array<{ readonly messages: Entry[] }> };

const typename = (schema: Type.AnyEntity) => `dxn:${Type.getTypename(schema)}:`;
const idOf = (ref: Ref) => ref['/'].split('/').at(-1);

describe('Reading Room', () => {
  test('seeds three illustrated feeds and a curated magazine', { timeout: 120_000 }, async ({ expect }) => {
    const { json } = await EffectEx.runPromise(buildArchive(ReadingRoomSpace.make()));
    const counts = histogram(json);
    const count = (schema: Type.AnyEntity) =>
      Object.entries(counts).find(([type]) => type.startsWith(typename(schema)))?.[1] ?? 0;
    expect(count(Subscription.Subscription)).toBe(3);
    expect(count(Subscription.Post)).toBe(30);
    expect(count(Subscription.PostContent)).toBe(30);
    expect(count(Magazine.Magazine)).toBe(1);

    const archive: Archive = JSON.parse(json);
    const objects = new Map(archive.objects.map((object) => [object.id, object]));
    const messages = archive.feeds.flatMap((feed) => feed.messages);
    const ofType = (entries: Entry[], schema: Type.AnyEntity) =>
      entries.filter((entry) => entry['@type']?.startsWith(typename(schema)));

    const posts = ofType(messages, Subscription.Post);
    const sourceOf = new Map(posts.map((post) => [post.id, post.source && idOf(post.source)]));
    const perFeed = posts.reduce<Record<string, number>>((tally, post) => {
      const source = sourceOf.get(post.id) ?? 'none';
      tally[source] = (tally[source] ?? 0) + 1;
      return tally;
    }, {});
    expect(Object.values(perFeed)).toEqual([10, 10, 10]);
    // Each feed lists its posts newest first, as a sync appends them.
    for (const feed of archive.feeds) {
      const published = ofType(feed.messages, Subscription.Post).map((post) => post.published ?? '');
      expect(published).toEqual([...published].sort().reverse());
    }
    expect(posts.every((post) => post.description?.includes('<img src="https://images.unsplash.com/'))).toBe(true);
    expect(ofType(messages, Subscription.PostContent).every((content) => content.imageUrl)).toBe(true);

    // The magazine draws four posts from each feed, each with its curation state.
    const [magazine] = ofType(archive.objects, Magazine.Magazine);
    const curated = (magazine.posts ?? []).map(idOf);
    expect(curated).toHaveLength(12);
    const curatedPerFeed = curated.reduce<Record<string, number>>((tally, id) => {
      const source = (id && sourceOf.get(id)) ?? 'none';
      tally[source] = (tally[source] ?? 0) + 1;
      return tally;
    }, {});
    expect(Object.values(curatedPerFeed)).toEqual([4, 4, 4]);
    const magazineState = magazine.postState && objects.get(idOf(magazine.postState) ?? '')?.state;
    expect(
      curated.every((id) => {
        const state = id ? magazineState?.[id] : undefined;
        return state?.rank !== undefined && state.snippet && state.imageUrl;
      }),
    ).toBe(true);

    // Read markers and starred tags live on the posts' subscriptions.
    const subscriptions = ofType(archive.objects, Subscription.Subscription);
    const childOf = (subscription: Entry, key: 'postState' | 'tags') => {
      const ref = (subscription as Record<string, unknown>)[key] as Ref | undefined;
      return ref && objects.get(idOf(ref) ?? '');
    };
    const read = subscriptions.flatMap((subscription) =>
      Object.values(childOf(subscription, 'postState')?.state ?? {}).filter((state) => state.readAt),
    );
    expect(read).toHaveLength(3);
    const starred = subscriptions.flatMap((subscription) =>
      Object.values(childOf(subscription, 'tags')?.index ?? {}).flat(),
    );
    expect(starred).toHaveLength(2);

    const collection = ofType(archive.objects, Collection.Collection).find((object) => object.name === 'Reading Room');
    expect((collection?.objects ?? []).map((ref) => objects.get(idOf(ref) ?? '')?.name)).toEqual([
      'Weekend Reading',
      'Orbit Weekly',
      'Trail & Tide',
      'The Workbench',
    ]);
  });
});
