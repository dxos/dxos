//
// Copyright 2025 DXOS.org
//

import { EditorSelection, type Extension, Prec, StateEffect, StateField } from '@codemirror/state';
import { type EditorView, keymap } from '@codemirror/view';

type Bookmark = {
  id: string;
  pos: number;
  name: string;
};

export const addBookmark = StateEffect.define<Bookmark>();
export const removeBookmark = StateEffect.define<string>();
export const clearBookmarks = StateEffect.define<void>();

/**
 * Registers a bookmarks state field and Mod-Arrow navigation keys.
 */
export const bookmarks = (): Extension => {
  return [
    bookmarksField,
    Prec.highest(
      keymap.of([
        {
          key: 'Mod-ArrowUp',
          run: (view) => navigateBookmark(view, 'up'),
        },
        {
          key: 'Mod-ArrowDown',
          run: (view) => navigateBookmark(view, 'down'),
        },
      ]),
    ),
  ];
};

// Jump to the nearest bookmark before/after the caret. Declines the key (returns false) when there
// is none so it falls through to the default behavior rather than being silently swallowed.
const navigateBookmark = (view: EditorView, direction: 'up' | 'down'): boolean => {
  const { bookmarks } = view.state.field(bookmarksField);
  const pos = view.state.selection.main.head;
  const target =
    direction === 'up'
      ? [...bookmarks].reverse().find((bookmark) => bookmark.pos < pos)
      : bookmarks.find((bookmark) => bookmark.pos > pos);
  if (!target) {
    return false;
  }

  view.dispatch({ selection: EditorSelection.cursor(target.pos), scrollIntoView: true });
  return true;
};

type BookmarkFieldState = {
  bookmarks: Bookmark[];
};

const bookmarksField = StateField.define<BookmarkFieldState>({
  create: (): BookmarkFieldState => ({
    bookmarks: [],
  }),

  update: (value: BookmarkFieldState, tr): BookmarkFieldState => {
    // Map bookmark positions through document changes.
    let bookmarks = value.bookmarks.map((bookmark) => ({
      ...bookmark,
      pos: tr.changes.mapPos(bookmark.pos),
    }));

    // Process effects.
    for (const effect of tr.effects) {
      if (effect.is(addBookmark)) {
        bookmarks = [...bookmarks, effect.value];
      } else if (effect.is(removeBookmark)) {
        bookmarks = bookmarks.filter((b) => b.id !== effect.value);
      } else if (effect.is(clearBookmarks)) {
        bookmarks = [];
      }
    }

    // Sort bookmarks by position.
    bookmarks.sort(({ pos: a }, { pos: b }) => a - b);
    return { bookmarks };
  },
});
