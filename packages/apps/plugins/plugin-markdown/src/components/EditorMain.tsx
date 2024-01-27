//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes } from 'react';

import { LayoutAction, useIntentResolver } from '@dxos/app-framework';
import { useTranslation } from '@dxos/react-ui';
import {
  type TextEditorProps,
  type Comment,
  MarkdownEditor,
  setFocus,
  useComments,
  useEditorView,
} from '@dxos/react-ui-editor';
import { focusRing, attentionSurface, mx, surfaceElevation } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

export type EditorMainProps = {
  comments?: Comment[];
} & Pick<TextEditorProps, 'model' | 'readonly' | 'editorMode' | 'extensions'>;

const EditorMain = ({ comments, ...props }: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);

  const [editorRef, editorView] = useEditorView();
  useComments(editorView, comments);

  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.FOCUS: {
        const object = data?.object;
        if (editorView) {
          setFocus(editorView, object);
        }
        break;
      }
    }
  });

  return (
    <MarkdownEditor
      ref={editorRef}
      autoFocus
      placeholder={t('editor placeholder')}
      slots={{
        root: {
          className: mx(
            'flex flex-col grow m-0.5',
            attentionSurface,
            focusRing,
            surfaceElevation({ elevation: 'group' }),
          ),
          'data-testid': 'composer.markdownRoot',
        } as HTMLAttributes<HTMLDivElement>,
        editor: {
          className: 'h-full pli-10 py-4 rounded',
        },
      }}
      {...props}
    />
  );
};

export default EditorMain;
