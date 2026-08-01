//
// Copyright 2024 DXOS.org
//

import { produce } from 'immer';

import { type DeckAction } from '#types';

export type AddSubjectsToActiveDeckOptions = {
  /** Insert opened subjects immediately after this plank (in-plank navigation anchors at its origin). */
  pivotId?: string;
  /** The plank currently holding the requested name, replaced in place instead of inserting. */
  replaceId?: string;
};

/**
 * Computes the next `active` list for an `'add'` disposition {@link LayoutOperation.Open}: inserts
 * subjects immediately after `pivotId` when present, else appends them at the end. Subjects already
 * open keep their position; when the open is named, the plank holding that name (`replaceId`) is
 * replaced in place so the deck reuses it rather than growing.
 */
export const addSubjectsToActiveDeck = (
  active: readonly string[],
  subject: readonly string[],
  options?: AddSubjectsToActiveDeckOptions,
): string[] => {
  const { pivotId, replaceId } = options ?? {};
  const next = [...active];
  const pivotIndex = pivotId ? next.indexOf(pivotId) : -1;
  let insertAt = pivotIndex !== -1 ? pivotIndex + 1 : next.length;
  // Only the first subject may take over the name, because that is the one the name is bound to (see
  // the Open handler). Letting a later subject take it instead would leave the name pointing at a
  // different plank than the one that replaced the old occupant.
  const replaceIndex = replaceId ? next.indexOf(replaceId) : -1;
  subject.forEach((entryId, index) => {
    const openIndex = next.indexOf(entryId);
    if (index === 0 && replaceIndex !== -1) {
      if (openIndex !== -1) {
        // Already open, so it keeps its own place and takes the name with it; the plank that held the
        // name stays open as an ordinary one rather than being replaced by something else.
        insertAt = openIndex + 1;
      } else {
        next[replaceIndex] = entryId;
        insertAt = replaceIndex + 1;
      }
      return;
    }

    if (openIndex !== -1) {
      return;
    }

    next.splice(insertAt, 0, entryId);
    insertAt += 1;
  });
  return next;
};

/** `names` with entries for planks no longer open removed, and `name` (when given) bound to `plankId`. */
export const updatePlankNames = (
  names: Record<string, string>,
  active: readonly string[],
  binding?: { name: string; plankId: string },
): Record<string, string> => {
  const next = Object.fromEntries(Object.entries(names).filter(([, plankId]) => active.includes(plankId)));
  if (binding && active.includes(binding.plankId)) {
    next[binding.name] = binding.plankId;
  }
  return next;
};

export const closeEntry = (deck: string[], entryId: string): string[] => {
  return produce(deck, (draft) => {
    const index = draft.findIndex((id) => id === entryId);
    if (index !== -1) {
      draft.splice(index, 1);
    }
  });
};

export const incrementPlank = (deck: string[], adjustment: DeckAction.Adjustment): string[] => {
  return produce(deck, (draft) => {
    const index = draft.findIndex((id) => id === adjustment.id);
    if (
      index === -1 ||
      (adjustment.type === 'increment-start' && index === 0) ||
      (adjustment.type === 'increment-end' && index === draft.length - 1)
    ) {
      return;
    }

    if (adjustment.type === 'increment-start') {
      // Swap the current item with the previous item.
      [draft[index - 1], draft[index]] = [draft[index], draft[index - 1]];
    } else if (adjustment.type === 'increment-end') {
      // Swap the current item with the next item.
      [draft[index], draft[index + 1]] = [draft[index + 1], draft[index]];
    }
  });
};

/**
 * Upper bound on the planks a seeded deck opens at once. Every plank mounts its article surface, so a
 * large collection would otherwise instantiate an editor per document on a single navtree click.
 */
export const MAX_SEEDED_PLANKS = 8;

/**
 * The planks a deck opens when navigating to a node whose type declares `initial: 'children'`, or
 * `undefined` when the open should proceed normally.
 *
 * Seeds only a navigation (`addBesideOrigin === false`): an `add`, a shift-forced add, or an `auto`
 * that grew a sliding deck are all requests to put *this* node beside what is already open, and
 * replacing the deck there would discard the planks the user was working in.
 */
export const resolveSeededPlanks = ({
  initial,
  addBesideOrigin,
  children,
}: {
  initial: 'children' | 'none' | undefined;
  addBesideOrigin: boolean;
  /** Ids of the node's openable graph children, in order. */
  children: readonly string[];
}): string[] | undefined => {
  // An empty collection falls through to the ordinary open, which shows the collection itself rather
  // than leaving the user on an empty deck.
  if (addBesideOrigin || initial !== 'children' || children.length === 0) {
    return undefined;
  }
  return children.slice(0, MAX_SEEDED_PLANKS);
};
