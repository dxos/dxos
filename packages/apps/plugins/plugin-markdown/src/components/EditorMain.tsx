//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, useMemo } from 'react';

import { LayoutAction, useIntentResolver } from '@dxos/app-framework';
import { useTranslation } from '@dxos/react-ui';
import {
  type TextEditorProps,
  type Comment,
  MarkdownEditor,
  Toolbar,
  focusComment,
  useComments,
  useEditorView,
  useActionHandler,
  useFormattingState,
} from '@dxos/react-ui-editor';
import { focusRing, attentionSurface, mx, surfaceElevation } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

export type EditorMainProps = {
  comments?: Comment[];
  toolbar?: boolean;
} & Pick<TextEditorProps, 'model' | 'readonly' | 'extensions'>;

const EditorMain = ({ comments, toolbar, extensions: _extensions, ...props }: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);

  const [editorRef, editorView] = useEditorView();
  useComments(editorView, comments);
  const handleAction = useActionHandler(editorView);

  // Focus comment.
  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.FOCUS: {
        const object = data?.object;
        if (editorView) {
          focusComment(editorView, object);
        }
        break;
      }
    }
  });

  // Toolbar state.
  const [formattingState, formattingObserver] = useFormattingState();
  const extensions = useMemo(() => [...(_extensions ?? []), formattingObserver], [_extensions, formattingObserver]);

  return (
    <div role='none' className='flex flex-col h-full'>
      {toolbar && (
        <Toolbar.Root onAction={handleAction} state={formattingState}>
          <Toolbar.Markdown />
          <Toolbar.Separator />
          <Toolbar.Extended />
        </Toolbar.Root>
      )}
      <div role='none' className='flex flex-col grow pb-8 overflow-y-auto'>
        <MarkdownEditor
          ref={editorRef}
          autoFocus
          placeholder={t('editor placeholder')}
          extensions={extensions}
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
      </div>
    </div>
  );
};

export default EditorMain;
