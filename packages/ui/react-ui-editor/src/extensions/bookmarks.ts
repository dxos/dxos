//
// Copyright 2025 DXOS.org
//

import { type Extension, Prec, StateEffect, StateField } from '@codemirror/state';
import { keymap } from '@codemirror/view';

type Bookmark = {
  id: string;
  pos: number;
  name: string;
};

export const addBookmark = StateEffect.define<Bookmark>();
export const removeBookmark = StateEffect.define<string>();
export const clearBookmarks = StateEffect.define<void>();

export const bookmarks = (): Extension => {
  return [
    bookmarksField,
    Prec.highest(
      keymap.of([
        {
          key: 'Mod-ArrowUp',
          run: (view) => {
            const bookmarks = view.state.field(bookmarksField);
            console.log('up', bookmarks);
            return true;
          },
        },
        {
          key: 'Mod-ArrowDown',
          run: (view) => {
            const bookmarks = view.state.field(bookmarksField);
            console.log('down', bookmarks);
            return true;
          },
        },
      ]),
    ),
  ];
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
