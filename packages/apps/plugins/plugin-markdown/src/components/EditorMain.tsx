//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, type RefCallback, useRef } from 'react';

import { LayoutAction, useIntentResolver } from '@dxos/app-framework';
import { useTranslation } from '@dxos/react-ui';
import { type TextEditorProps, type TextEditorRef, MarkdownEditor, setFocus } from '@dxos/react-ui-editor';
import { focusRing, inputSurface, mx, surfaceElevation } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

// TODO(burdon): Don't export ref.
export type EditorMainProps = {
  editorRefCb?: RefCallback<TextEditorRef>;
} & Pick<TextEditorProps, 'model' | 'readonly' | 'comments' | 'extensions' | 'editorMode'>;

export const EditorMain = ({ editorRefCb, ...props }: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);

  // TODO(burdon): Reconcile refs.
  const editorRef = useRef<TextEditorRef>();
  const setEditorRef: RefCallback<TextEditorRef> = (ref) => {
    editorRef.current = ref as any;
    editorRefCb?.(ref);
  };

  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.FOCUS: {
        const { object } = data;
        setFocus(editorRef.current!.view!, object);
      }
    }
  });

  return (
    <MarkdownEditor
      {...props}
      ref={setEditorRef}
      slots={{
        root: {
          role: 'none',
          className: mx(
            focusRing,
            inputSurface,
            surfaceElevation({ elevation: 'group' }),
            'flex flex-col shrink-0 grow pli-10 m-0.5 py-2',
            'rounded',
          ),
          'data-testid': 'composer.markdownRoot',
        } as HTMLAttributes<HTMLDivElement>,
        editor: {
          placeholder: t('editor placeholder'),
          theme: {
            '&, & .cm-scroller': {
              display: 'flex',
              flexDirection: 'column',
              flex: '1 0 auto',
              inlineSize: '100%',
            },
            '& .cm-content': {
              flex: '1 0 auto',
              inlineSize: '100%',
              paddingBlock: '1rem',
            },
          },
        },
      }}
    />
  );
};
