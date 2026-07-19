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

/** Effective placement for an {@link LayoutOperation.Open} once the user's setting/modifier has been resolved. */
export type NavigationSetting = 'replace' | 'new-plank';

/** Requested placement for an {@link LayoutOperation.Open}, before resolving against the user's setting. */
export type NavigationDisposition = 'default' | 'inverse' | NavigationSetting;

/**
 * Resolves the effective disposition for an {@link LayoutOperation.Open} from the user's
 * `navigationDefault` setting and the caller's requested disposition.
 * `undefined`/`'default'` defers to the setting; `'inverse'` flips it (held for a modifier key, e.g.
 * shift-click) — inversion is symmetric, so flipping the setting mirrors the modifier behavior for
 * free; explicit `'replace'`/`'new-plank'` pass through unchanged, for callers that must force a
 * specific outcome regardless of the setting (e.g. {@link useShowItem}'s pivot-open path).
 */
export const resolveDisposition = (
  setting: NavigationSetting,
  disposition?: NavigationDisposition,
): NavigationSetting => {
  switch (disposition) {
    case undefined:
    case 'default':
      return setting;
    case 'inverse':
      return setting === 'replace' ? 'new-plank' : 'replace';
    default:
      return disposition;
  }
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

export type ReplaceSubjectsOnActiveDeckOptions = {
  /** Index of the plank in `active` to replace. */
  index: number;
};

/**
 * Computes the next `active` list for a `'replace'` disposition {@link LayoutOperation.Open}: swaps
 * the plank at `index` for `subject`, splicing any additional subjects in immediately after it.
 * Subjects already open elsewhere in the deck are removed from their old position rather than
 * duplicated — they relocate into the replaced slot instead.
 */
export const replaceSubjectsOnActiveDeck = (
  active: readonly string[],
  subject: readonly string[],
  options: ReplaceSubjectsOnActiveDeckOptions,
): string[] => {
  if (subject.length === 0) {
    return [...active];
  }

  const { index } = options;
  // Drop the replaced plank and any subjects already open elsewhere so reinsertion doesn't duplicate them.
  const withoutTarget = active.filter((id, position) => position !== index && !subject.includes(id));
  const insertAt = Math.min(index, withoutTarget.length);
  return [...withoutTarget.slice(0, insertAt), ...subject, ...withoutTarget.slice(insertAt)];
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
