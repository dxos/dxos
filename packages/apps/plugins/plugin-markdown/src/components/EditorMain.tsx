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
  cursorLineMargin,
  editorFillLayoutRoot,
  focusComment,
  useComments,
  useEditorView,
  useActionHandler,
  useFormattingState,
} from '@dxos/react-ui-editor';
import { attentionSurface, focusRing, mx, textBlockWidth } from '@dxos/react-ui-theme';

import { MARKDOWN_PLUGIN } from '../meta';

export type EditorMainProps = {
  comments?: Comment[];
  toolbar?: boolean;
} & Pick<TextEditorProps, 'model' | 'readonly' | 'extensions'>;

export const EditorMain = ({ model, comments, toolbar, extensions: _extensions, ...props }: EditorMainProps) => {
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
          classNames='max-is-[60rem] justify-self-center border-be separator-separator'
          state={formattingState}
          onAction={handleAction}
        >
          <Toolbar.Markdown />
          <Toolbar.Separator />
          <Toolbar.Extended />
        </Toolbar.Root>
      )}
      <div
        role='none'
        data-toolbar={toolbar ? 'enabled' : 'disabled'}
        className='is-full bs-full overflow-hidden data-[toolbar=disabled]:pbs-2'
      >
        <MarkdownEditor
          ref={editorRef}
          autoFocus
          scrollPastEnd
          moveToEndOfLine
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
                !toolbar && 'border-bs separator-separator',
              ),
              'data-testid': 'composer.markdownRoot',
            } as HTMLAttributes<HTMLDivElement>,
            content: {
              // TODO(burdon): Override (!) required since base theme sets padding and scrollPastEnd sets bottom.
              className: mx('!pli-2 sm:!pli-6 md:!pli-8 !pbs-2 sm:!pbs-6 md:!pbs-8'),
            },
          }}
          {...props}
        />
      </div>
    </>
  );
};

export default EditorMain;
