//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';

import { type Obj } from '@dxos/echo';
import { AtomObj, AtomRef } from '@dxos/echo-atom';

import { type Magazine, type Subscription } from '../types';
import { getImageUrl, getSnippet } from '../util/post-content';
import { postReadAtom } from './post-read';
import { postTagsAtom } from './post-tags';

/** Aggregate per-Post display data folded from the Post + its source Subscription's per-Post slice. */
export type MagazinePostData = {
  post: Obj.Snapshot<Subscription.Post>;
  feedName: string | undefined;
  read: boolean;
  starred: boolean;
  snippet: string;
  imageUrl: string | undefined;
};

/**
 * Aggregate display data for one tile within a magazine. Fires only on this Post's
 * read/star/feed-name/postState changes.
 *
 * Snippet and imageUrl precedence: agent-written postState > RSS-derived description fallback.
 */
export const postDisplayAtom = Atom.family((key: readonly [Subscription.Post, Magazine.Magazine]) =>
  Atom.make<MagazinePostData>((get) => {
    const [post, magazine] = key;
    const snapshot = get(AtomObj.make(post));
    const ref = post.source;
    const subscription = ref ? get(AtomRef.make(ref)) : undefined;
    // `name`/`url` via property atoms — fire only on name/url change (e.g. after first sync).
    const feedName = subscription
      ? get(AtomObj.makeProperty(subscription, 'name')) || get(AtomObj.makeProperty(subscription, 'url'))
      : undefined;
    const { readAt } = get(postReadAtom(post));
    const { starred } = get(postTagsAtom(post));
    // Magazine postState carries agent-written snippet/imageUrl; fall back to description derivation.
    const magazineSnapshot = get(AtomObj.make(magazine));
    const postState = (magazineSnapshot.postState as Record<string, Partial<Magazine.PostState>> | undefined)?.[post.id];
    return {
      post: snapshot,
      feedName,
      read: readAt !== undefined,
      starred,
      snippet: postState?.snippet ?? getSnippet(snapshot),
      imageUrl: postState?.imageUrl ?? getImageUrl(snapshot),
    };
  }).pipe(Atom.keepAlive),
);

/** Aggregate per-Post display data for a magazine tile. */
export const useMagazinePostData = (
  post: Subscription.Post,
  magazine: Magazine.Magazine,
): MagazinePostData => useAtomValue(postDisplayAtom([post, magazine]));
