//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Doc } from '@dxos/echo-doc';
import { useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';
import {
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
} from '@dxos/ui-editor';

//
// The canonical text surface: Composer's markdown extension bundle over `Text.content`, with no
// knowledge that a lens exists. Deliberately the source view — syntax visible, highlighted — because
// this pane's job is to show the string as stored. (`decorateMarkdown`, which hides the markers and
// renders marks in place, is what a document surface adds on top; it would obscure the point here.)
//
// Its automerge extension applies character-level edits, which is why a lens write has to be a splice:
// a whole-document rewrite from the other editor would fight it and destroy this one's cursor.
//

export const MarkdownEditor = ({ text }: { text: Text.Text }) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      initialValue: text.content ?? '',
      extensions: [
        createBasicExtensions({ placeholder: 'Markdown…', search: true }),
        createThemeExtensions({ themeMode, syntaxHighlighting: true, slots: { scroller: { className: 'p-2' } } }),
        createMarkdownExtensions(),
        createDataExtensions({ id: 'lens-demo', text: Doc.createAccessor(text, ['content']) }),
      ],
    }),
    [text, themeMode],
  );

  return <div ref={parentRef} className='min-h-0 overflow-auto' data-testid='markdown-editor' />;
};
