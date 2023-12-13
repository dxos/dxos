//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, useRef } from 'react';

import {
  createHyperlinkTooltip,
  hyperlinkDecoration,
  MarkdownEditor,
  type MarkdownEditorProps,
  type MarkdownEditorRef,
} from '@dxos/react-ui-editor';
import { focusRing, mx } from '@dxos/react-ui-theme';

import { type EditorMainProps } from './EditorMain';
import { onTooltip } from './extensions';

// TODO(burdon): Reconcile types.
type EditorSectionProps = Pick<EditorMainProps, 'showWidgets'> & Pick<MarkdownEditorProps, 'model' | 'editorMode'>;

export const EditorSection = ({ model, editorMode, showWidgets }: EditorSectionProps) => {
  const editorRef = useRef<MarkdownEditorRef>(null);
  const extensions = [createHyperlinkTooltip(onTooltip)];
  if (showWidgets) {
    extensions.push(hyperlinkDecoration());
  }

  return (
    <MarkdownEditor
      ref={editorRef}
      model={model}
      extensions={extensions}
      editorMode={editorMode}
      slots={{
        root: {
          role: 'none',
          className: mx(focusRing, 'm-0.5 is-[calc(100%-4px)]'),
          'data-testid': 'composer.markdownRoot',
        } as HTMLAttributes<HTMLDivElement>,
        editor: {
          markdownTheme: {
            '&, & .cm-scroller': {
              inlineSize: '100%',
            },
            '& .cm-content': {
              paddingBlock: '1rem',
            },
            '& .cm-line': { paddingInline: '0' },
          },
        },
      }}
    />
  );
};
