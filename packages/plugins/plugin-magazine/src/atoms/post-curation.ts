//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react';
import { Atom } from 'effect/unstable/reactivity';

import { StateMap } from '@dxos/schema';

import * as Magazine from '../types/Magazine';
import type * as Subscription from '../types/Subscription';

/** Per-Post magazine-scoped curation slice (agent-written snippet/hero image). */
export type CurationSlice = { snippet: string | undefined; imageUrl: string | undefined };

const EMPTY_CURATION_SLICE: CurationSlice = { snippet: undefined, imageUrl: undefined };

/**
 * This Post's magazine-scoped curation slice (snippet/imageUrl), sliced off the Magazine's
 * `postState`. Fires only when this Post's slice changes — sibling Posts' curation mutations are
 * discarded without propagating. Keyed by a structurally-equal tuple key `[post, magazine])`.
 */
export const postCurationAtom = Atom.family((key: readonly [Subscription.Post, Magazine.Magazine]) =>
  Atom.make<CurationSlice>((get) => {
    const [post, magazine] = key;
    const stateMap = get(magazine.postState.atom);
    if (!stateMap) {
      return EMPTY_CURATION_SLICE;
    }
    const state = get(StateMap.atom<Magazine.PostState>(stateMap, post.id));
    return { snippet: state.snippet, imageUrl: state.imageUrl };
  }).pipe(Atom.keepAlive),
);

/** This Post's magazine-scoped curation slice. */
export const usePostCuration = (post: Subscription.Post, magazine: Magazine.Magazine): CurationSlice =>
  useAtomValue(postCurationAtom([post, magazine]));
