//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useMemo, useEffect } from 'react';

import { LayoutAction, parseFileManagerPlugin, useResolvePlugin, useIntentResolver } from '@dxos/app-framework';
import { useRefCallback } from '@dxos/react-async';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type Comment,
  type TextEditorProps,
  TextEditor,
  Toolbar,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  editorFillLayoutRoot,
  editorFillLayoutEditor,
  focusComment,
  useComments,
  useActionHandler,
  useFormattingState,
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
  readonly?: boolean;
  toolbar?: boolean;
  comments?: Comment[];
} & Pick<TextEditorProps, 'doc' | 'selection' | 'scrollTo' | 'extensions'>;

export const EditorMain = ({ id, readonly, toolbar, comments, extensions: _extensions, ...props }: EditorMainProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const { themeMode } = useThemeContext();
  const fileManagerPlugin = useResolvePlugin(parseFileManagerPlugin);

  const { ref: editorRef, value: view } = useRefCallback<EditorView>();
  useComments(view, id, comments);
  useTest(view);

  // Toolbar actions.
  const handleAction = useActionHandler(view);

  // Focus comment.
  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.FOCUS: {
        const object = data?.object;
        if (view) {
          focusComment(view, object);
          return { data: true };
        }
        break;
      }
    }
  });

  const [formattingState, formattingObserver] = useFormattingState();
  const extensions = useMemo(() => {
    return [
      _extensions,
      formattingObserver,
      createBasicExtensions({ readonly, placeholder: t('editor placeholder'), scrollPastEnd: true }),
      createMarkdownExtensions({ themeMode }),
      createThemeExtensions({
        themeMode,
        slots: {
          editor: { className: editorFillLayoutEditor },
          content: {
            // TODO(burdon): Overrides (!) are required since the built-in base theme sets padding and scrollPastEnd sets bottom.
            className: mx('!pli-2 sm:!pli-6 md:!pli-8 !pbs-2 sm:!pbs-6 md:!pbs-8'),
          },
        },
      }),
    ].filter(nonNullable);
  }, [_extensions, formattingObserver, readonly, themeMode]);

  return (
    <>
      {toolbar && (
        <Toolbar.Root
          classNames='max-is-[60rem] justify-self-center border-be separator-separator'
          state={formattingState}
          onAction={handleAction}
        >
          <Toolbar.Markdown />
          {fileManagerPlugin?.provides.file.upload && (
            <Toolbar.Custom
              onUpload={async (file) => {
                const info = await fileManagerPlugin.provides.file.upload!(file);
                return { url: info?.url };
              }}
            />
          )}
          <Toolbar.Separator />
          <Toolbar.Actions />
        </Toolbar.Root>
      )}
      <div
        role='none'
        data-toolbar={toolbar ? 'enabled' : 'disabled'}
        className='is-full bs-full overflow-hidden data-[toolbar=disabled]:pbs-2'
      >
        <TextEditor
          {...props}
          id={id}
          extensions={extensions}
          autoFocus
          moveToEndOfLine
          className={mx(
            focusRing,
            attentionSurface,
            textBlockWidth,
            editorFillLayoutRoot,
            'md:border-is md:border-ie separator-separator focus-visible:ring-inset',
            !toolbar && 'border-bs separator-separator',
          )}
          dataTestId='composer.markdownRoot'
          ref={editorRef}
        />
      </div>
    </>
  );
};

export default EditorMain;
