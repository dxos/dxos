//
// Copyright 2026 DXOS.org
//

import React, { useEffect } from 'react';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Ref } from '@dxos/echo';
import { useObject, useResolveRef } from '@dxos/react-client/echo';
import { Text } from '@dxos/schema';

import { Book } from '#types';

export type BookNotesCompanionProps = AppSurface.ArticleProps<Book.Book>;

/**
 * Companion surface editing a book's private notes as markdown. The notes are a `Text` document; the
 * actual editor is delegated to plugin-markdown via a nested {@link Surface} (the notes text rendered
 * in the Article role), so this plugin holds no editor dependency.
 */
export const BookNotesCompanion = ({ subject: book, role, attendableId }: BookNotesCompanionProps) => {
  // Subscribe so the view updates when the notes document is created below.
  const [live] = useObject(book);
  const notes = useResolveRef(book.notes);

  // Imported books have no notes document (it is optional on the wire); create one on demand so the
  // editor always has a target.
  useEffect(() => {
    if (book.notes) {
      return;
    }
    const db = Obj.getDatabase(book);
    if (!db) {
      return;
    }
    const text = db.add(Text.make({ content: '' }));
    Obj.update(book, (book) => {
      book.notes = Ref.make(text);
    });
  }, [book, live]);

  if (!notes) {
    return null;
  }

  return <Surface.Surface type={AppSurface.Article} data={{ subject: notes, attendableId }} role={role} limit={1} />;
};
