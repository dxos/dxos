//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useMemo, useEffect } from 'react';

import { LayoutAction, useIntentResolver } from '@dxos/app-framework';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type Comment,
  Toolbar,
  cursorLineMargin,
  editorFillLayoutRoot,
  editorFillLayoutEditor,
  useComments,
  useEditorView,
  useActionHandler,
  useFormattingState,
  TextEditor,
  type TextEditorProps,
  createThemeExtensions,
  createMarkdownExtensions,
  decorateMarkdown,
  focusComment,
  createBasicExtensions,
} from '@dxos/react-ui-editor';
import { attentionSurface, focusRing, mx, textBlockWidth } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { MARKDOWN_PLUGIN } from '../meta';

// Expose editor view for playwright tests.
// TODO(wittjosiah): Find a better way to expose this or find a way to limit it to test runs.
const useTest = (view: EditorView | null) => {
  useEffect(() => {
    const composer = (window as any).composer;
    if (composer) {
      composer.editorView = view;
    }
  }, [view]);
};

export type EditorMainProps = {
  id: string;
  doc?: string; // TODO(burdon): Rename content.
  comments?: Comment[];
  toolbar?: boolean;
  readonly?: boolean;
} & Pick<TextEditorProps, 'extensions'>;

export const EditorMain = ({
  id,
  doc,
  comments,
  toolbar,
  readonly,
  extensions: _extensions,
  ...props
}: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const { themeMode } = useThemeContext();

  const [editorRef, viewInvalidated] = useEditorView(id);
  useComments(viewInvalidated ? null : editorRef.current, id, comments);
  const handleAction = useActionHandler(editorRef.current);
  useTest(editorRef.current);

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
  const extensions = useMemo(() => {
    console.log('??', _extensions?.length);
    return [
      createBasicExtensions({ readonly, placeholder: t('editor placeholder'), scrollPastEnd: true }),
      createMarkdownExtensions({ themeMode }),
      createThemeExtensions({
        themeMode,
        slots: {
          editor: { className: editorFillLayoutEditor },
          content: {
            // TODO(burdon): Override (!) required since base theme sets padding and scrollPastEnd sets bottom.
            className: mx('!pli-2 sm:!pli-6 md:!pli-8 !pbs-2 sm:!pbs-6 md:!pbs-8'),
          },
        },
      }),
      // TODO(burdon): Other extensions.
      decorateMarkdown(),
      cursorLineMargin,
      formattingObserver,
      _extensions,
    ].filter(nonNullable);
  }, [_extensions, formattingObserver]);

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
        <TextEditor
          dataTestId='composer.markdownRoot'
          ref={editorRef}
          autoFocus
          moveToEndOfLine
          doc={doc}
          extensions={extensions}
          className={mx(
            focusRing,
            attentionSurface,
            textBlockWidth,
            editorFillLayoutRoot,
            'md:border-is md:border-ie separator-separator focus-visible:ring-inset',
            !toolbar && 'border-bs separator-separator',
          )}
        />
      </div>
    </>
  );
};

export default EditorMain;
