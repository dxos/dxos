//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useMemo, useEffect } from 'react';

import {
  LayoutAction,
  parseFileManagerPlugin,
  useResolvePlugin,
  useIntentResolver,
  parseNavigationPlugin,
  parseLayoutPlugin,
} from '@dxos/app-framework';
import { useThemeContext, useTranslation, useRefCallback } from '@dxos/react-ui';
import {
  type Comment,
  type DNDOptions,
  type TextEditorProps,
  TextEditor,
  Toolbar,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  dropFile,
  editorFillLayoutRoot,
  editorFillLayoutEditor,
  scrollThreadIntoView,
  useComments,
  useActionHandler,
  useFormattingState,
  processAction,
} from '@dxos/react-ui-editor';
import { focusRing, mx, textBlockWidth } from '@dxos/react-ui-theme';
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
  const navigationPlugin = useResolvePlugin(parseNavigationPlugin);
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const isAttended = navigationPlugin?.provides.attention?.attended?.has(id) ?? false;
  const idParts = id.split(':');
  const docId = idParts[idParts.length - 1];

  const { refCallback: editorRefCallback, value: editorView } = useRefCallback<EditorView>();

  useComments(editorView, docId, comments);
  useTest(editorView);

  // Focus comment.
  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.SCROLL_INTO_VIEW: {
        const id = data?.id;
        if (editorView) {
          scrollThreadIntoView(editorView, id);
          return undefined;
        }
        break;
      }
    }
  });

  // Toolbar actions.
  const handleAction = useActionHandler(editorView);
  const [formattingState, formattingObserver] = useFormattingState();

  const handleDrop: DNDOptions['onDrop'] = async (view, { files }) => {
    const info = await fileManagerPlugin?.provides.file.upload?.(files[0]);
    if (info) {
      processAction(view, { type: 'image', data: info.url });
    }
  };

  const extensions = useMemo(() => {
    return [
      _extensions,
      fileManagerPlugin && dropFile({ onDrop: handleDrop }),
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
    <div role='none' className='contents group/editor' {...(isAttended && { 'aria-current': 'location' })}>
      {toolbar && (
        <Toolbar.Root
          classNames='max-is-[60rem] justify-self-center border-be border-transparent group-focus-within/editor:separator-separator group-[[aria-current]]/editor:separator-separator'
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
          id={docId}
          extensions={extensions}
          autoFocus={
            layoutPlugin?.provides.layout.scrollIntoView ? layoutPlugin?.provides.layout.scrollIntoView === id : true
          }
          moveToEndOfLine
          className={mx(
            focusRing,
            textBlockWidth,
            editorFillLayoutRoot,
            'group-focus-within/editor:attention-surface group-[[aria-current]]/editor:attention-surface md:border-is md:border-ie border-transparent group-focus-within/editor:separator-separator group-[[aria-current]]/editor:separator-separator focus-visible:ring-inset',
            !toolbar && 'border-bs separator-separator',
          )}
          dataTestId='composer.markdownRoot'
          ref={editorRefCallback}
        />
      </div>
    </div>
  );
};

export default EditorMain;
