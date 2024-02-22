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
  editorFillLayoutEditor,
  editorFillLayoutRoot,
  focusComment,
  useComments,
  useEditorView,
  useActionHandler,
  useFormattingState,
  cursorLineMargin,
  editorHalfViewportOverscrollContent,
} from '@dxos/react-ui-editor';
import { attentionSurface, focusRing, mx, textBlockWidth } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

export type EditorMainProps = {
  comments?: Comment[];
  toolbar?: boolean;
} & Pick<TextEditorProps, 'model' | 'readonly' | 'extensions'>;

const EditorMain = ({ model, comments, toolbar, extensions: _extensions, ...props }: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);

  const [editorRef, viewInvalidated] = useEditorView(model.id);
  useComments(viewInvalidated ? null : editorRef.current, model.id, comments);
  const handleAction = useActionHandler(editorRef.current);

  // Expose editor view for playwright tests.
  // TODO(wittjosiah): Find a better way to expose this or find a way to limit it to test runs.
  useEffect(() => {
    const composer = (window as any).composer;
    if (composer) {
      composer.editorView = editorRef.current;
    }

    // TODO(thure): What is scrolling when CM starts?
    if (editorRef.current?.scrollDOM) {
      console.log('!!');
      // editorRef.current?.scrollDOM.scrollTo(0, 0);
    }
  }, [editorRef.current]);

  // Focus comment.
  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.FOCUS: {
        const object = data?.object;
        if (editorRef.current) {
          focusComment(editorRef.current, object);
          return { data: true };
        }
        break;
      }
    }
  });

  // Toolbar state.
  const [formattingState, formattingObserver] = useFormattingState();
  const extensions = useMemo(
    () => [...(_extensions ?? []), formattingObserver, cursorLineMargin],
    [_extensions, formattingObserver],
  );

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
        data-toolbar={toolbar ? 'enabled' : 'disabled'}
        className='is-full bs-full overflow-hidden data-[toolbar=disabled]:pbs-8'
      >
        <MarkdownEditor
          ref={editorRef}
          autoFocus
          placeholder={t('editor placeholder')}
          model={model}
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
              className: mx(editorFillLayoutEditor, !toolbar && 'border-bs separator-separator'),
            },
            content: {
              // after:block after:is-px after:bs-px after:overflow-anchor after:-mbs-px
              className: mx(editorHalfViewportOverscrollContent, '!p-2 sm:!p-6 md:!p-8'),
            },
          }}
          {...props}
        />
      </div>
    </>
  );
};

export default EditorMain;
