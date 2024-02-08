//
// Copyright 2023 DXOS.org
//

import React, { type HTMLAttributes, useMemo, useEffect } from 'react';

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
  editorHalfViewportOverscrollContent,
  editorFillLayoutEditor,
  editorFillLayoutRoot,
} from '@dxos/react-ui-editor';
import { attentionSurface, focusRing, mx, textBlockWidth } from '@dxos/react-ui-theme';

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

  // Expose editor view for playwright tests.
  // TODO(wittjosiah): Find a better way to expose this or find a way to limit it to test runs.
  useEffect(() => {
    const composer = (window as any).composer;
    if (composer) {
      composer.editorView = editorView;
    }
  }, [editorView]);

  // Focus comment.
  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.FOCUS: {
        const object = data?.object;
        if (editorView) {
          focusComment(editorView, object);
          return { data: true };
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
      <div
        role='none'
        className={mx(
          'is-full overflow-y-auto overflow-anchored after:block after:is-px after:bs-px after:overflow-anchor after:-mbs-px',
        )}
      >
        <MarkdownEditor
          ref={editorRef}
          autoFocus
          placeholder={t('editor placeholder')}
          extensions={extensions}
          slots={{
            root: {
              className: mx(
                focusRing,
                attentionSurface,
                textBlockWidth,
                editorFillLayoutRoot,
                'md:border-is md:border-ie separator-separator focus-visible:ring-inset',
              ),
              'data-testid': 'composer.markdownRoot',
            } as HTMLAttributes<HTMLDivElement>,
            editor: {
              className: mx(editorFillLayoutEditor, 'is-full pli-2 sm:pli-6 md:pli-8 py-2', !toolbar && 'border-bs'),
            },
            content: {
              className: editorHalfViewportOverscrollContent,
            },
          }}
          {...props}
        />
      </div>
    </>
  );
};

export default EditorMain;
