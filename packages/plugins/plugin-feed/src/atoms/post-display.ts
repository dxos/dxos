//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';
import * as Data from 'effect/Data';

import { Obj } from '@dxos/echo';

import { type Magazine, type Subscription } from '../types';
import { getImageUrl, getSnippet } from '../util/post-content';
import { postCurationAtom } from './post-curation';
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
 * read/star/feed-name/curation changes. Keyed by a value-equal `Data.tuple([post, magazine])`.
 *
 * Snippet and imageUrl precedence: agent-written postState > RSS-derived description fallback.
 */
export const postDisplayAtom = Atom.family((key: readonly [Subscription.Post, Magazine.Magazine]) =>
  Atom.make<MagazinePostData>((get) => {
    const [post, magazine] = key;
    const snapshot = get(Obj.atom(post));
    const ref = post.source;
    const subscription = ref ? get(ref.atom) : undefined;
    // `name`/`url` via property atoms — fire only on name/url change (e.g. after first sync).
    const feedName = subscription
      ? get(Obj.atomProperty(subscription, 'name')) || get(Obj.atomProperty(subscription, 'url'))
      : undefined;
    const { readAt } = get(postReadAtom(post));
    const { starred } = get(postTagsAtom(post));
    // Agent-written snippet/imageUrl (granular per-Post slice); fall back to description derivation.
    const curation = get(postCurationAtom(Data.tuple(post, magazine)));
    return {
      post: snapshot,
      feedName,
      read: readAt !== undefined,
      starred,
      snippet: curation.snippet ?? getSnippet(snapshot),
      imageUrl: curation.imageUrl ?? getImageUrl(snapshot),
    };
  }).pipe(Atom.keepAlive),
);

/** Aggregate per-Post display data for a magazine tile. */
export const useMagazinePostData = (post: Subscription.Post, magazine: Magazine.Magazine): MagazinePostData =>
  useAtomValue(postDisplayAtom(Data.tuple(post, magazine)));
