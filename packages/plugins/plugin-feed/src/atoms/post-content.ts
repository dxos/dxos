//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';

import { Obj } from '@dxos/echo';
import { AtomQuery, AtomRef } from '@dxos/echo-atom';

import { Subscription } from '../types';

/** This Post's fetched body (newest {@link Subscription.PostContent} entry), or undefined. */
export const postContentAtom = Atom.family((post: Subscription.Post) =>
  Atom.make<Subscription.PostContent | undefined>((get) => {
    const ref = post.source;
    if (!ref) {
      return undefined;
    }
    const subscription = get(AtomRef.make(ref));
    if (!subscription) {
      return undefined;
    }
    const db = Obj.getDatabase(subscription);
    const query = Subscription.queryPostContentForPost(subscription, post);
    if (!db || !query) {
      return undefined;
    }
    const entries = get(AtomQuery.make<Subscription.PostContent>(db, query));
    return Subscription.pickLatestPostContent(entries);
  }).pipe(Atom.keepAlive),
);

/** This Post's fetched body, reactively. */
export const usePostContentAtom = (post: Subscription.Post): Subscription.PostContent | undefined =>
  useAtomValue(postContentAtom(post));
