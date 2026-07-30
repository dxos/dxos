//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Obj } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { createBasicExtensions, createDataExtensions, createThemeExtensions } from '@dxos/ui-editor';

//
// The canonical text surface: the core markdown editor bound straight to `Text.content`, with no
// knowledge that a lens exists. Its automerge extension applies character-level edits, which is why a
// lens write has to be a splice — a whole-document rewrite from the other editor would fight it.
//

export const MarkdownEditor = ({ text }: { text: Obj.Unknown }) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      initialValue: (text as { content?: string }).content ?? '',
      extensions: [
        createBasicExtensions({ placeholder: 'Markdown…' }),
        createThemeExtensions({ themeMode, slots: { scroller: { className: 'p-2' } } }),
        createDataExtensions({ id: 'lens-demo', text: Doc.createAccessor(text, ['content']) }),
      ],
    }),
    [text, themeMode],
  );

  return <div ref={parentRef} className='min-h-0 overflow-auto' data-testid='markdown-editor' />;
};
