//
// Copyright 2026 DXOS.org
//

import { Atom, useAtomValue } from '@effect-atom/atom-react';

import { Obj } from '@dxos/echo';
import { AtomRef } from '@dxos/echo-atom';

import { Subscription } from '../types';

/** Per-Post read slice. */
export type ReadSlice = { readAt: string | undefined };

const EMPTY_READ_SLICE: ReadSlice = { readAt: undefined };

/**
 * This Post's `readAt`, sliced off its source Subscription's `postState`. Subscribes to the shared
 * Subscription but re-emits ONLY when this Post's `readAt` changes — sibling Posts' mutations are
 * recomputed and discarded without propagating.
 */
export const postReadAtom = Atom.family((post: Subscription.Post) =>
  Atom.make<ReadSlice>((get) => {
    const ref = post.source;
    if (!ref) {
      return EMPTY_READ_SLICE;
    }
    // AtomRef resolves the live Subscription and fires only on load (not on mutation).
    const subscription = get(AtomRef.make(ref));
    if (!subscription) {
      return EMPTY_READ_SLICE;
    }
    let previous = Subscription.getReadAt(subscription, post.id);
    const unsubscribe = Obj.subscribe(subscription, () => {
      const next = Subscription.getReadAt(subscription, post.id);
      if (next !== previous) {
        previous = next;
        get.setSelf({ readAt: next });
      }
    });
    get.addFinalizer(() => unsubscribe());
    return { readAt: previous };
  }).pipe(Atom.keepAlive),
);

/** This Post's read slice. */
export const useReadState = (post: Subscription.Post): ReadSlice => useAtomValue(postReadAtom(post));
