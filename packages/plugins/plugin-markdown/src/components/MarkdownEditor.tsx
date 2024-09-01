//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useMemo, useEffect } from 'react';

import {
  LayoutAction,
  useResolvePlugin,
  useIntentResolver,
  parseLayoutPlugin,
  type FileInfo,
  type LayoutCoordinate,
} from '@dxos/app-framework';
import { parseAttentionPlugin } from '@dxos/plugin-attention';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type Action,
  type DNDOptions,
  type EditorViewMode,
  type EditorInputMode,
  type Extension,
  type UseTextEditorProps,
  Toolbar,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  dropFile,
  processAction,
  scrollThreadIntoView,
  useActionHandler,
  useCommentState,
  useCommentClickListener,
  useFormattingState,
  useTextEditor,
  editorContent,
} from '@dxos/react-ui-editor';
import { sectionToolbarLayout } from '@dxos/react-ui-stack';
import { textBlockWidth, focusRing, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { MARKDOWN_PLUGIN } from '../meta';
import type { MarkdownPluginState } from '../types';

const attentionFragment = mx(
  'group-focus-within/editor:attention-surface group-[[aria-current]]/editor:attention-surface',
  'group-focus-within/editor:separator-separator',
);

export type MarkdownEditorProps = {
  id: string;
  coordinate?: LayoutCoordinate;
  inputMode?: EditorInputMode;
  role?: string;
  scrollPastEnd?: boolean;
  toolbar?: boolean;
  viewMode?: EditorViewMode;
  onViewModeChange?: (id: string, mode: EditorViewMode) => void;
  onCommentSelect?: (id: string) => void;
  onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
} & Pick<UseTextEditorProps, 'initialValue' | 'selection' | 'scrollTo' | 'extensions'> &
  Partial<Pick<MarkdownPluginState, 'extensionProviders'>>;

export const MarkdownEditor = ({
  id,
  role = 'article',
  initialValue,
  // TODO(burdon): Consolidate extensions.
  extensions,
  extensionProviders,
  scrollTo,
  scrollPastEnd,
  selection,
  toolbar,
  viewMode,
  onCommentSelect,
  onFileUpload,
  onViewModeChange,
}: MarkdownEditorProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const { themeMode } = useThemeContext();
  const attentionPlugin = useResolvePlugin(parseAttentionPlugin);
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const attended = Array.from(attentionPlugin?.provides.attention?.attended ?? []);
  const isDirectlyAttended = attended.length === 1 && attended[0] === id;
  const [formattingState, formattingObserver] = useFormattingState();

  // TODO(burdon): Factor out.
  const providerExtensions = useMemo(
    () =>
      extensionProviders?.reduce((extensions: Extension[], provider) => {
        extensions.push(typeof provider === 'function' ? provider({}) : provider);
        return extensions;
      }, []),
    [extensionProviders],
  );

  // TODO(Zan): Move these into thread plugin as well?
  const [commentsState, commentObserver] = useCommentState();
  const commentClickObserver = useCommentClickListener((id) => {
    onCommentSelect?.(id);
  });

  // Focus comment.
  useIntentResolver(MARKDOWN_PLUGIN, ({ action, data }) => {
    switch (action) {
      case LayoutAction.SCROLL_INTO_VIEW: {
        if (editorView) {
          // TODO(Zan): Try catch this. Fails when thread plugin not present?
          scrollThreadIntoView(editorView, data?.id);
          if (data?.id === id) {
            editorView.scrollDOM
              .closest('[data-attendable-id]')
              ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'start' });
          }
          return undefined;
        }
        break;
      }
    }
  });

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
        role !== 'section' && onFileUpload ? dropFile({ onDrop: handleDrop }) : [],
        providerExtensions,
        extensions,
      ].filter(nonNullable),
      ...(role !== 'section' && {
        id,
        selection,
        scrollTo,
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

  // Drag files.
  const handleDrop: DNDOptions['onDrop'] = async (view, { files }) => {
    const file = files[0];
    const info = file && onFileUpload ? await onFileUpload(file) : undefined;
    if (info) {
      processAction(view, { type: 'image', data: info.url });
    }
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
        <div role='none' className={mx('flex shrink-0 justify-center', attentionFragment)}>
          <Toolbar.Root
            classNames={
              role === 'section'
                ? ['z-[2] group-focus-within/section:visible', !attended && 'invisible', sectionToolbarLayout]
                : [
                    textBlockWidth,
                    'group-focus-within/editor:separator-separator group-[[aria-current]]/editor:separator-separator',
                  ]
            }
            state={formattingState && { ...formattingState, ...commentsState }}
            onAction={handleAction}
          >
            <Toolbar.Markdown />
            {onFileUpload && <Toolbar.Custom onUpload={onFileUpload} />}
            <Toolbar.Separator />
            <Toolbar.View mode={viewMode ?? 'preview'} />
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
          // TODO(burdon): Factor out margin for focus.
          role === 'section'
            ? mx('flex flex-col flex-1 min-bs-[12rem] mt-[2px]', focusRing)
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
