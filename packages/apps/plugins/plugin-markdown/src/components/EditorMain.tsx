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
  Toolbar,
  focusComment,
  useComments,
  useEditorView,
  useActionHandler,
} from '@dxos/react-ui-editor';
import { focusRing, attentionSurface, mx, surfaceElevation } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

export type EditorMainProps = {
  comments?: Comment[];
  toolbar?: boolean;
} & Pick<TextEditorProps, 'model' | 'readonly' | 'editorMode' | 'extensions'>;

const EditorMain = ({ comments, toolbar, ...props }: EditorMainProps) => {
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

  return (
    <div role='none' className='flex flex-col h-full'>
      {toolbar && (
        <Toolbar.Root onAction={handleAction}>
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
