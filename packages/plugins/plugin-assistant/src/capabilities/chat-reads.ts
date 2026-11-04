//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import type * as Registry from 'effect/reactivity/AtomRegistry';

import { type AssistantCapabilities } from '#types';

/**
 * Tracks which chats have a finished turn nobody has seen: a chat whose URI leaves `busy` while no view of it is open
 * becomes unread, and opening a view reads it. Held in memory, so a reload forgets it.
 */
export const makeChatReads = (
  registry: Registry.AtomRegistry,
  busy: Atom.Atom<ReadonlySet<string>>,
): { reads: AssistantCapabilities.ChatReads; dispose: () => void } => {
  // Held as a list because a writable atom made from a Set is read as a stream of its members.
  const unreadList = Atom.make<readonly string[]>([]).pipe(Atom.keepAlive);
  const unread = Atom.make<ReadonlySet<string>>((get) => new Set(get(unreadList))).pipe(Atom.keepAlive);
  const openViews = new Map<string, number>();
  const update = (change: (next: Set<string>) => void) => {
    const next = new Set(registry.get(unreadList));
    change(next);
    registry.set(unreadList, [...next]);
  };

  let previous = registry.get(busy);
  const dispose = registry.subscribe(busy, (current) => {
    const finished = [...previous].filter((uri) => !current.has(uri) && !openViews.has(uri));
    previous = current;
    if (finished.length > 0) {
      update((next) => {
        for (const uri of finished) {
          next.add(uri);
        }
      });
    }
  });

  const open = (uri: string) => {
    openViews.set(uri, (openViews.get(uri) ?? 0) + 1);
    if (registry.get(unread).has(uri)) {
      update((next) => next.delete(uri));
    }

    return () => {
      const count = (openViews.get(uri) ?? 1) - 1;
      if (count > 0) {
        openViews.set(uri, count);
      } else {
        openViews.delete(uri);
      }
    };
  };

  return { reads: { unread, open }, dispose };
};
