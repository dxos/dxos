//
// Copyright 2024 DXOS.org
//

import { produce } from 'immer';

import { type DeckAction } from '#types';

export type AddSubjectsToActiveDeckOptions = {
  /** Insert opened subjects immediately after this plank (in-plank navigation anchors at its origin). */
  pivotId?: string;
  /** Replace an existing plank whose id shares this key prefix, instead of inserting. */
  key?: string;
};

/**
 * Computes the next `active` list for an `'add'` disposition {@link LayoutOperation.Open}: inserts
 * subjects immediately after `pivotId` when present, else appends them at the end. Subjects already
 * open keep their position; a subject whose `key` matches an existing plank replaces it in place.
 */
export const addSubjectsToActiveDeck = (
  active: readonly string[],
  subject: readonly string[],
  options?: AddSubjectsToActiveDeckOptions,
): string[] => {
  const { pivotId, key } = options ?? {};
  const next = [...active];
  const pivotIndex = pivotId ? next.indexOf(pivotId) : -1;
  let insertAt = pivotIndex !== -1 ? pivotIndex + 1 : next.length;
  for (const entryId of subject) {
    if (next.includes(entryId)) {
      continue;
    }
    const keyIndex = key ? next.findIndex((id) => id.split('+')[0] === key) : -1;
    if (keyIndex !== -1) {
      next[keyIndex] = entryId;
      continue;
    }
    next.splice(insertAt, 0, entryId);
    insertAt += 1;
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
