//
// Copyright 2026 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { Keyboard, nestKeyboardContext } from '@dxos/keyboard';

import { useAttention } from './components';

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
  /** Stable id for the article (used as the keyboard context path). */
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
 * Wire 'j' (next) and 'k' (previous) keyboard shortcuts for an article that
 * navigates a list of items (e.g., messages, events). Bindings are scoped to
 * the article's keyboard context so they only fire while the article has attention.
 *
 * Pass the items directly; ids are derived via `getId` (defaults to `item.id`).
 * Clamps at list boundaries. Active only when the article is attended.
 */
export const useArticleKeyboardNavigation: {
  <T extends { id: string }>(options: UseArticleKeyboardNavigationOptions<T>): void;
  <T>(options: UseArticleKeyboardNavigationOptions<T> & { getId: (item: T) => string }): void;
} = <T>({ articleId, items, currentId, getId, onSelect }: UseArticleKeyboardNavigationOptions<T>): void => {
  const { hasAttention } = useAttention(articleId);

  // `getId` is optional only when `T extends { id: string }` (enforced by the overloads above),
  // so the fallback is sound; the cast bridges the generic erased by the implementation signature.
  const ids = useMemo(() => items.map((item) => (getId ? getId(item) : (item as { id: string }).id)), [items, getId]);

  useEffect(() => {
    if (!hasAttention) {
      return;
    }

    const contextPath = nestKeyboardContext(articleId);
    const context = Keyboard.singleton.getContext(contextPath);
    const prevContext = Keyboard.singleton.getCurrentContext();
    Keyboard.singleton.setCurrentContext(contextPath);

    const nextBinding = {
      shortcut: 'j',
      handler: () => {
        const target = advance({ ids, currentId, delta: 1 });
        if (target !== undefined) {
          onSelect(target);
        }
      },
      data: 'Next item',
      disableInput: true,
    };
    const prevBinding = {
      shortcut: 'k',
      handler: () => {
        const target = advance({ ids, currentId, delta: -1 });
        if (target !== undefined) {
          onSelect(target);
        }
      },
      data: 'Previous item',
      disableInput: true,
    };

    context.bind(nextBinding);
    context.bind(prevBinding);

    return () => {
      context.unbind('j');
      context.unbind('k');
      // Restore the prior context if we were the ones who set it.
      if (Keyboard.singleton.getCurrentContext() === contextPath) {
        Keyboard.singleton.setCurrentContext(prevContext);
      }
    };
  }, [articleId, ids, currentId, onSelect, hasAttention]);
};
