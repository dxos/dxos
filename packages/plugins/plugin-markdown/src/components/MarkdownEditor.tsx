//
// Copyright 2023 DXOS.org
//

import { openSearchPanel } from '@codemirror/search';
import { type EditorView } from '@codemirror/view';
import React, { useMemo, useEffect, useCallback } from 'react';

import {
  type FileInfo,
  LayoutAction,
  type LayoutCoordinate,
  useResolvePlugin,
  parseLayoutPlugin,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import { useIsDirectlyAttended } from '@dxos/react-ui-attention';
import {
  type Action,
  type DNDOptions,
  type EditorViewMode,
  type EditorInputMode,
  type UseTextEditorProps,
  Toolbar,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  dropFile,
  processAction,
  useActionHandler,
  useCommentState,
  useCommentClickListener,
  useFormattingState,
  useTextEditor,
  editorContent,
  editorGutter,
} from '@dxos/react-ui-editor';
import { sectionToolbarLayout } from '@dxos/react-ui-stack';
import { textBlockWidth, focusRing, mx } from '@dxos/react-ui-theme';
import { isNotFalsy, nonNullable } from '@dxos/util';

import { useSelectCurrentThread } from '../hooks';
import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownPluginState } from '../types';

// TODO(Zan): Factor into a shared location.
const attentionFragment = mx(
  'group-focus-within/editor:attention-surface group-[[aria-current]]/editor:attention-surface',
  'group-focus-within/editor:border-separator',
);

const DEFAULT_VIEW_MODE: EditorViewMode = 'preview';

export type MarkdownEditorProps = {
  id: string;
  coordinate?: LayoutCoordinate;
  inputMode?: EditorInputMode;
  role?: string;
  scrollPastEnd?: boolean;
  toolbar?: boolean;
  viewMode?: EditorViewMode;
  onViewModeChange?: (id: string, mode: EditorViewMode) => void;
  onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
} & Pick<UseTextEditorProps, 'initialValue' | 'scrollTo' | 'selection' | 'extensions'> &
  Partial<Pick<MarkdownPluginState, 'extensionProviders'>>;

export const MarkdownEditor = ({
  id,
  role = 'article',
  initialValue,
  extensions,
  extensionProviders,
  scrollPastEnd,
  scrollTo,
  selection,
  toolbar,
  viewMode,
  onFileUpload,
  onViewModeChange,
}: MarkdownEditorProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const { themeMode } = useThemeContext();
  const dispatch = useIntentDispatcher();
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const [formattingState, formattingObserver] = useFormattingState();
  const isDirectlyAttended = useIsDirectlyAttended(id);

  // Extensions from other plugins.
  const providerExtensions = useMemo(
    // TODO(burdon): Must pass object to provider.
    () => extensionProviders?.flatMap((provider) => provider({})).filter(nonNullable),
    [extensionProviders],
  );

  // TODO(Zan): Move these into thread plugin as well?
  const [commentsState, commentObserver] = useCommentState();
  const onCommentClick = useCallback(() => {
    void dispatch({ action: LayoutAction.SET_LAYOUT, data: { element: 'complementary', state: true } });
  }, [dispatch]);
  const commentClickObserver = useCommentClickListener(onCommentClick);

  // Drag files.
  const handleDrop: DNDOptions['onDrop'] = async (view, { files }) => {
    const file = files[0];
    const info = file && onFileUpload ? await onFileUpload(file) : undefined;
    if (info) {
      processAction(view, { type: 'image', data: info.url });
    }
  };

  const {
    parentRef,
    view: editorView,
    focusAttributes,
  } = useTextEditor(
    () => ({
      initialValue,
      extensions: [
        formattingObserver,
        commentObserver,
        commentClickObserver,
        createBasicExtensions({
          readonly: viewMode === 'readonly',
          placeholder: t('editor placeholder'),
          scrollPastEnd: role === 'section' ? false : scrollPastEnd,
        }),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({
          themeMode,
          syntaxHighlighting: true,
          slots: { content: { className: editorContent } },
        }),
        editorGutter,
        role !== 'section' && onFileUpload && dropFile({ onDrop: handleDrop }),
        providerExtensions,
        extensions,
      ].filter(isNotFalsy),
      ...(role !== 'section' && {
        id,
        scrollTo,
        selection,
        // TODO(wittjosiah): Autofocus based on layout is racy.
        autoFocus: layoutPlugin?.provides.layout ? layoutPlugin?.provides.layout.scrollIntoView === id : true,
        moveToEndOfLine: true,
      }),
    }),
    [id, initialValue, formattingObserver, viewMode, themeMode, extensions, providerExtensions],
  );

  useTest(editorView);
  useSelectCurrentThread(editorView, id);

  // Toolbar handler.
  const handleToolbarAction = useActionHandler(editorView);
  const handleAction = (action: Action) => {
    switch (action.type) {
      case 'search': {
        if (editorView) {
          openSearchPanel(editorView);
        }
        return;
      }
      case 'view-mode': {
        onViewModeChange?.(id, action.data);
        return;
      }
    }

    handleToolbarAction?.(action);
  };

  return (
    <div
      role='none'
      // TODO(burdon): Move role logic out of here (see sheet, table, sketch, etc.)
      {...(role === 'section'
        ? { className: 'flex flex-col' }
        : {
            className: 'contents group/editor',
            ...(isDirectlyAttended && { 'aria-current': 'location' }),
          })}
    >
      {toolbar && (
        <div role='none' className={mx('flex shrink-0 justify-center overflow-x-auto', attentionFragment)}>
          <Toolbar.Root
            classNames={
              role === 'section'
                ? [
                    textBlockWidth,
                    'z-[2] group-focus-within/section:visible',
                    !isDirectlyAttended && 'invisible',
                    sectionToolbarLayout,
                  ]
                : [
                    textBlockWidth,
                    'group-focus-within/editor:border-separator group-[[aria-current]]/editor:border-separator',
                  ]
            }
            state={formattingState && { ...formattingState, ...commentsState }}
            onAction={handleAction}
          >
            <Toolbar.Markdown />
            {onFileUpload && <Toolbar.Custom onUpload={onFileUpload} />}
            <Toolbar.Separator />
            <Toolbar.View mode={viewMode ?? DEFAULT_VIEW_MODE} />
            <Toolbar.Actions />
          </Toolbar.Root>
        </div>
      )}
      <div
        role='none'
        ref={parentRef}
        data-testid='composer.markdownRoot'
        data-toolbar={toolbar ? 'enabled' : 'disabled'}
        className={
          role === 'section'
            ? mx('flex flex-col flex-1 min-bs-[12rem]', focusRing)
            : mx(
                'flex is-full bs-full overflow-hidden',
                focusRing,
                attentionFragment,
                'focus-visible:ring-inset',
                'data-[toolbar=disabled]:pbs-2 data-[toolbar=disabled]:row-span-2',
              )
        }
        {...focusAttributes}
      />
    </div>
  );
};

// Expose editor view for playwright tests.
// TODO(wittjosiah): Find a better way to expose this or find a way to limit it to test runs.
const useTest = (view?: EditorView) => {
  useEffect(() => {
    const composer = (window as any).composer;
    if (composer) {
      composer.editorView = view;
    }
  }, [view]);
};

export default MarkdownEditor;
