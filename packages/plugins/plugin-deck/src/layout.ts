//
// Copyright 2024 DXOS.org
//

import { produce } from 'immer';

import { type DeckAction } from '#types';

type OpenLayoutEntryOptions = {
  key?: string;
};

/**
 * Mutates a deck list using stack semantics: new items open to the right (`push`).
 * Callers that open from a pivot must truncate the deck first (see deck `open` operation).
 */
export const openEntry = (deck: readonly string[], entryId: string, options?: OpenLayoutEntryOptions): string[] => {
  return produce([...deck], (draft) => {
    if (draft.find((id) => id === entryId)) {
      return;
    }

    const key = options?.key;
    if (key) {
      const index = draft.findIndex((id) => id.split('+')[0] === key);
      if (index !== -1) {
        draft.splice(index, 1, entryId);
        return;
      }
    }

    draft.push(entryId);
  });
};

export type OpenSubjectsOnActiveDeckOptions = {
  pivotId?: string;
  key?: string;
};

/**
 * Computes the next multi-mode `active` list for {@link LayoutOperation.Open}.
 * If `pivotId` is present and found, truncates the deck after that id.
 * Applies each subject with {@link openEntry}.
 * If the pivot is missing, appends onto the full `active` list.
 *
 * When all subjects are already present in the active deck, the deck is returned
 * unchanged so that pivot truncation does not discard open planks when navigating
 * to something that is already visible.
 */
export const openSubjectsOnActiveDeck = (
  active: readonly string[],
  subject: readonly string[],
  options?: OpenSubjectsOnActiveDeckOptions,
): string[] => {
  if (subject.length > 0 && subject.every((id) => active.includes(id))) {
    return [...active];
  }

  const { pivotId, key } = options ?? {};
  const pivotIndex = pivotId ? active.findIndex((id) => id === pivotId) : -1;
  const baseDeck = pivotIndex !== -1 ? active.slice(0, pivotIndex + 1) : [...active];
  return subject.reduce((acc, entryId) => openEntry(acc, entryId, { key }), baseDeck);
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
