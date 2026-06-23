//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Data from 'effect/Data';

import { Obj } from '@dxos/echo';

import { type Magazine, type Subscription } from '../types';
import { publishedTimestamp } from '../util/date';
import { postTagsAtom } from './post-tags';

/**
 * Tile filter mode. Mutually exclusive — `default` shows everything except archived,
 * `starred` filters to starred posts, `archived` shows only archived posts.
 */
export type MagazineView = 'default' | 'starred' | 'archived';

/**
 * Ordered Posts referenced by the Magazine, derived directly from the `magazine.posts` refs — no
 * query. Fires when the refs array changes (membership/order) or when a ref resolves. Resolving each
 * ref here, rather than a `reference('posts').from(Scope.space(...))` query, avoids the cross-feed
 * fan-out that returned each curated Post once per feed scope.
 */
const magazinePostsAtom = Atom.family((magazine: Magazine.Magazine) =>
  Atom.make<Subscription.Post[]>((get) => {
    const refs = get(Obj.atomProperty(magazine, 'posts')) ?? [];
    const posts = refs.map((ref) => get(ref.atom)).filter((post): post is Subscription.Post => Boolean(post));
    return [...posts].sort((postA, postB) => publishedTimestamp(postB.published) - publishedTimestamp(postA.published));
  }),
);

/**
 * Whether a Post is visible under a given view. Depends ONLY on the Post's tag slice + view, so
 * read-state changes never wake it (and effect-atom dedupes the boolean). Keyed by a value-equal
 * `Data.tuple([post, view])` rather than a nested family — the intermediate of a nested family is
 * only weakly held and could be GC'd out from under its mounted leaf atoms.
 */
const postVisibilityAtom = Atom.family((key: readonly [Subscription.Post, MagazineView]) =>
  Atom.make<boolean>((get) => {
    const [post, view] = key;
    const { starred, archived } = get(postTagsAtom(post));
    switch (view) {
      case 'archived':
        return archived;
      case 'starred':
        return !archived && starred;
      default:
        return !archived;
    }
  }),
);

/**
 * Ordered, view-filtered Posts for a Magazine. Re-runs on membership change OR a Post crossing the
 * view's filter boundary (star/archive); never on read-state changes. Keyed by a value-equal
 * `Data.tuple([magazine, view])`.
 */
export const visibleMagazinePostsAtom: (
  key: readonly [Magazine.Magazine, MagazineView],
) => Atom.Atom<Subscription.Post[]> = Atom.family((key: readonly [Magazine.Magazine, MagazineView]) =>
  Atom.make<Subscription.Post[]>((get) => {
    const [magazine, view] = key;
    const posts = get(magazinePostsAtom(magazine));
    return posts.filter((post) => get(postVisibilityAtom(Data.tuple(post, view))));
  }),
);

/** Ordered, view-filtered Posts for a Magazine. */
export const useVisibleMagazinePosts = (magazine: Magazine.Magazine, view: MagazineView): Subscription.Post[] =>
  useAtomValue(visibleMagazinePostsAtom(Data.tuple(magazine, view)));
