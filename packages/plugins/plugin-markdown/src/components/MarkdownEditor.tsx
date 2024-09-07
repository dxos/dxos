//
// Copyright 2023 DXOS.org
//

import { EditorView } from '@codemirror/view';
import React, { useMemo, useEffect, useCallback } from 'react';

import {
  type FileInfo,
  LayoutAction,
  type LayoutCoordinate,
  useResolvePlugin,
  useIntentResolver,
  parseLayoutPlugin,
  useIntentDispatcher,
} from '@dxos/app-framework';
import { parseAttentionPlugin } from '@dxos/plugin-attention';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
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
  Cursor,
  setSelection,
} from '@dxos/react-ui-editor';
import { sectionToolbarLayout } from '@dxos/react-ui-stack';
import { textBlockWidth, focusRing, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { MARKDOWN_PLUGIN } from '../meta';
import type { MarkdownPluginState } from '../types';

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
  const attentionPlugin = useResolvePlugin(parseAttentionPlugin);
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const attended = Array.from(attentionPlugin?.provides.attention?.attended ?? []);
  const isDirectlyAttended = attended.length === 1 && attended[0] === id;
  const [formattingState, formattingObserver] = useFormattingState();

  // Extensions from other plugins.
  const providerExtensions = useMemo(() => extensionProviders?.map((provider) => provider({})), [extensionProviders]);

  // TODO(Zan): Move these into thread plugin as well?
  const [commentsState, commentObserver] = useCommentState();
  const onCommentClick = useCallback(() => {
    void dispatch({ action: LayoutAction.SET_LAYOUT, data: { element: 'complementary', state: true } });
  }, [dispatch]);
  const commentClickObserver = useCommentClickListener(onCommentClick);

  // Focus the space that references the comment.
  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      // TODO(burdon): Use fully qualified ids everywhere.
      case LayoutAction.SCROLL_INTO_VIEW: {
        if (editorView && data?.id === id && data?.cursor) {
          // TODO(burdon): We need typed intents.
          const range = Cursor.getRangeFromCursor(editorView.state, data.cursor);
          if (range?.from) {
            const selection = editorView.state.selection.main.from !== range.from ? { anchor: range.from } : undefined;
            const effects = [
              // NOTE: This does not use the DOM scrollIntoView function.
              EditorView.scrollIntoView(range.from, { y: 'start', yMargin: 96 }),
            ];
            if (selection) {
              // Update the editor selection to get bi-directional highlighting.
              effects.push(setSelection.of({ current: id }));
            }

            editorView.dispatch({
              effects,
              selection: selection ? { anchor: range.from } : undefined,
            });
          }
        }
        break;
      }
    }
  });

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
        createThemeExtensions({ themeMode, slots: { content: { className: editorContent } } }),
        editorGutter,
        role !== 'section' && onFileUpload ? dropFile({ onDrop: handleDrop }) : [],
        providerExtensions,
        extensions,
      ].filter(nonNullable),
      ...(role !== 'section' && {
        id,
        scrollTo,
        selection,
        // TODO(wittjosiah): Autofocus based on layout is racey.
        autoFocus: layoutPlugin?.provides.layout ? layoutPlugin?.provides.layout.scrollIntoView === id : true,
        moveToEndOfLine: true,
      }),
    }),
    [id, initialValue, formattingObserver, viewMode, themeMode, extensions, providerExtensions],
  );

  useTest(editorView);

  // Toolbar handler.
  const handleToolbarAction = useActionHandler(editorView);
  const handleAction = (action: Action) => {
    if (action.type === 'view-mode') {
      onViewModeChange?.(id, action.data);
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
