//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';

import { StateMap } from '@dxos/app-toolkit';
import { AtomRef } from '@dxos/echo-atom';

import { Subscription } from '../types';

/** Per-Post read slice. */
export type ReadSlice = { readAt: string | undefined };

const EMPTY_READ_SLICE: ReadSlice = { readAt: undefined };

/**
 * This Post's `readAt`, sliced off its source Subscription's `postState`. Fires only when this
 * Post's `readAt` changes — sibling Posts' mutations are discarded without propagating.
 */
export const postReadAtom = Atom.family((post: Subscription.Post) =>
  Atom.make<ReadSlice>((get) => {
    const ref = post.source;
    if (!ref) {
      return EMPTY_READ_SLICE;
    }
    const subscription = get(AtomRef.make(ref));
    if (!subscription) {
      return EMPTY_READ_SLICE;
    }
    const state = get(StateMap.atom<Subscription.PostState>(subscription, 'postState', post.id));
    return { readAt: state.readAt };
  }).pipe(Atom.keepAlive),
);

/** This Post's read slice. */
export const useReadState = (post: Subscription.Post): ReadSlice => useAtomValue(postReadAtom(post));
