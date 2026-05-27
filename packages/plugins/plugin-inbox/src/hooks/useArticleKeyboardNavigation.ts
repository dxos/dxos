//
// Copyright 2026 DXOS.org
//

import { useEffect } from 'react';

import { Keyboard } from '@dxos/keyboard';
import { useAttention } from '@dxos/react-ui-attention';

/**
 * Compute the id to select after pressing 'n' (delta = 1) or 'p' (delta = -1).
 * Clamps at the list ends — pressing 'n' on the last item keeps the last item
 * selected (Gmail-style), and 'p' on the first item keeps the first.
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

export type UseArticleKeyboardNavigationOptions = {
  /** Stable id for the article (used as the keyboard context path). */
  articleId: string;
  /** Ordered list of selectable item ids as they appear in the article. */
  ids: readonly string[];
  /** Currently-selected id, if any. */
  currentId: string | undefined;
  /** Called with the id to select when the user presses 'n' or 'p'. */
  onSelect: (id: string) => void;
};

/**
 * Wire 'n' (next) and 'p' (previous) keyboard shortcuts for an article that
 * navigates a list of items (e.g., messages, events). Bindings are scoped to
 * the article's keyboard context so they only fire while the article has attention.
 *
 * Clamps at list boundaries. Active only when the article is attended.
 */
export const useArticleKeyboardNavigation = ({
  articleId,
  ids,
  currentId,
  onSelect,
}: UseArticleKeyboardNavigationOptions): void => {
  const { hasAttention } = useAttention(articleId);

  useEffect(() => {
    if (!hasAttention) {
      return;
    }

    const context = Keyboard.singleton.getContext(articleId);
    const prevContext = Keyboard.singleton.getCurrentContext();
    Keyboard.singleton.setCurrentContext(articleId);

    const nextBinding = {
      shortcut: 'n',
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
      shortcut: 'p',
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
      context.unbind('n');
      context.unbind('p');
      // Restore the prior context if we were the ones who set it.
      if (Keyboard.singleton.getCurrentContext() === articleId) {
        Keyboard.singleton.setCurrentContext(prevContext);
      }
    };
  }, [articleId, ids, currentId, onSelect, hasAttention]);
};
