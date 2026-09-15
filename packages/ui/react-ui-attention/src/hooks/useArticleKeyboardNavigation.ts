//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { useHotkeys } from '@dxos/react-focus';

import { useAttention } from '../components/index.ts';

/**
 * Compute the id to select after pressing 'j' (delta = 1) or 'k' (delta = -1).
 * Clamps at the list ends — pressing 'j' on the last item keeps the last item
 * selected (vim-style), and 'k' on the first item keeps the first.
 *
 * When no current selection exists, returns the first id (for delta = 1) or the
 * last id (for delta = -1) so the user can enter the list with either key.
 */
export const advance = ({
  ids,
  currentId,
  delta,
}: {
  ids: readonly string[];
  currentId: string | undefined;
  delta: 1 | -1;
}): string | undefined => {
  if (ids.length === 0) {
    return undefined;
  }

  const idx = currentId ? ids.indexOf(currentId) : -1;
  if (idx === -1) {
    return delta === 1 ? ids[0] : ids[ids.length - 1];
  }

  const next = Math.max(0, Math.min(ids.length - 1, idx + delta));
  return ids[next];
};

export type UseArticleKeyboardNavigationOptions<T> = {
  /** Stable id for the article; also the hotkey command id. */
  articleId: string;
  /** Ordered list of selectable items as they appear in the article. */
  items: readonly T[];
  /** Currently-selected id, if any. */
  currentId: string | undefined;
  /** Extracts the id from an item. Defaults to `item.id`. */
  getId?: (item: T) => string;
  /** Called with the id to select when the user presses 'j' or 'k'. */
  onSelect: (id: string) => void;
};

/**
 * Wire 'j' (next) and 'k' (previous) for an article that navigates a list of items (e.g. messages,
 * events). This moves the *selection*, never focus, and it is gated on the article having
 * attention — so it is a hotkey rather than a focus group, and the gate is `enabled` rather than a
 * scope, since attention is already React state here.
 *
 * Pass the items directly; ids are derived via `getId` (defaults to `item.id`).
 * Clamps at list boundaries.
 */
export const useArticleKeyboardNavigation: {
  <T extends { id: string }>(options: UseArticleKeyboardNavigationOptions<T>): void;
  <T>(options: UseArticleKeyboardNavigationOptions<T> & { getId: (item: T) => string }): void;
} = <T>({ articleId, items, currentId, getId, onSelect }: UseArticleKeyboardNavigationOptions<T>): void => {
  const { hasAttention } = useAttention(articleId);

  // `getId` is optional only when `T extends { id: string }` (enforced by the overloads above),
  // so the fallback is sound; the cast bridges the generic erased by the implementation signature.
  const ids = useMemo(() => items.map((item) => (getId ? getId(item) : (item as { id: string }).id)), [items, getId]);

  const move = (delta: 1 | -1) => {
    const target = advance({ ids, currentId, delta });
    if (target !== undefined) {
      onSelect(target);
    }
  };

  useHotkeys({
    id: articleId,
    commands: [
      { hotkey: 'j', label: 'Next item', enabled: () => hasAttention, action: () => move(1) },
      { hotkey: 'k', label: 'Previous item', enabled: () => hasAttention, action: () => move(-1) },
    ],
  });
};
