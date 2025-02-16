//
// Copyright 2024 DXOS.org
//

import { produce } from 'immer';

import { type DeckAction, type NewPlankPositioning } from './types';

type OpenLayoutEntryOptions = { key?: string; positioning?: NewPlankPositioning; pivotId?: string };

export const openEntry = (deck: string[], entryId: string, options?: OpenLayoutEntryOptions): string[] => {
  return produce(deck, (draft) => {
    // Check that the entry is not already in the part
    if (draft.find((id) => id === entryId)) {
      return;
    }

    const key = options?.key;
    const plankPositioning = options?.positioning ?? 'start';
    const pivotId = options?.pivotId;

    if (key) {
      const index = draft.findIndex((id) => id.startsWith(key));
      if (index !== -1) {
        draft.splice(index, 1, entryId);
        return;
      }
    }

    if (pivotId) {
      const pivotIndex = draft.findIndex((id) => id === pivotId);
      if (pivotIndex !== -1) {
        if (plankPositioning === 'start') {
          draft.splice(pivotIndex, 0, entryId);
        } else {
          draft.splice(pivotIndex + 1, 0, entryId);
        }
        return;
      }
    }

    // If no pivot found or provided, fall back to original behavior
    if (plankPositioning === 'start') {
      draft.unshift(entryId);
    } else {
      draft.push(entryId);
    }
  });
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
