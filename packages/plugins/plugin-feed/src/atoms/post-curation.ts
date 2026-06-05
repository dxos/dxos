//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';

import { Obj } from '@dxos/echo';

import { Magazine, type Subscription } from '../types';

/** Per-Post magazine-scoped curation slice (agent-written snippet/hero image). */
export type CurationSlice = { snippet: string | undefined; imageUrl: string | undefined };

/**
 * This Post's magazine-scoped curation slice (snippet/imageUrl), sliced off the Magazine's
 * `postState`. Subscribes to the shared Magazine but re-emits ONLY when this Post's slice changes —
 * sibling Posts' curation mutations are recomputed and discarded without propagating.
 */
export const postCurationAtom = Atom.family((key: readonly [Subscription.Post, Magazine.Magazine]) =>
  Atom.make<CurationSlice>((get) => {
    const [post, magazine] = key;
    const read = (): CurationSlice => {
      const state = Magazine.getPostState(magazine, post.id);
      return { snippet: state.snippet, imageUrl: state.imageUrl };
    };
    let previous = read();
    const unsubscribe = Obj.subscribe(magazine, () => {
      const next = read();
      if (next.snippet !== previous.snippet || next.imageUrl !== previous.imageUrl) {
        previous = next;
        get.setSelf(next);
      }
    });
    get.addFinalizer(() => unsubscribe());
    return previous;
  }).pipe(Atom.keepAlive),
);

/** This Post's magazine-scoped curation slice. */
export const usePostCuration = (post: Subscription.Post, magazine: Magazine.Magazine): CurationSlice =>
  useAtomValue(postCurationAtom([post, magazine]));
