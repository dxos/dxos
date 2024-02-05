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
import { focusRing, attentionSurface, mx, textBlockWidth } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

export type EditorMainProps = {
  comments?: Comment[];
  toolbar?: boolean;
} & Pick<TextEditorProps, 'model' | 'readonly' | 'editorMode' | 'extensions'>;

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
    <>
      {toolbar && (
        <Toolbar.Root
          onAction={handleAction}
          state={formattingState}
          classNames='max-is-[60rem] justify-self-center border-be separator-separator'
        >
          <Toolbar.Markdown />
          <Toolbar.Separator />
          <Toolbar.Extended />
        </Toolbar.Root>
      )}
      <MarkdownEditor
        ref={editorRef}
        autoFocus
        placeholder={t('editor placeholder')}
        extensions={extensions}
        slots={{
          root: {
            className: mx(focusRing, 'overflow-y-auto overscroll-auto scroll-smooth'),
            'data-testid': 'composer.markdownRoot',
          } as HTMLAttributes<HTMLDivElement>,
          editor: {
            className: mx(
              attentionSurface,
              textBlockWidth,
              'is-full min-bs-[calc(100%-4rem)] justify-self-center pli-3 sm:pli-6 md:pli-10 py-4 mbe-16 border-be md:border-is md:border-ie separator-separator',
              !toolbar && 'border-bs',
            ),
          },
        }}
        {...props}
      />
    </>
  );
};

export default EditorMain;
