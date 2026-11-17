//
// Copyright 2026 DXOS.org
//

import { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';
import { splitSlides } from '@dxos/react-ui-slides';

import { type SlideSource } from '#deck';

/**
 * A markdown document's live content as deck slides; ids are positional since slides have no identity of their own.
 */
export const useDocumentDeck = (document: Markdown.Document): SlideSource[] => {
  const [content] = useObject(document.content, 'content');
  const db = Obj.getDatabase(document);
  return useMemo(
    () =>
      content === undefined
        ? []
        : splitSlides(content).map((slide, index): SlideSource => ({
            kind: 'markdown',
            id: `${document.id}:${index}`,
            content: slide,
            db,
          })),
    [document.id, content, db],
  );
};
