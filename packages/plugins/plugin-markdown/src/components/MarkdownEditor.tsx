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
  editorScroller,
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
} from '@dxos/react-ui-editor';
import { sectionToolbarLayout } from '@dxos/react-ui-stack';
import { textBlockWidth, focusRing, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { MARKDOWN_PLUGIN } from '../meta';
import type { MarkdownPluginState } from '../types';

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

export type MarkdownEditorProps = {
  id: string;
  toolbar?: boolean;
  scrollPastEnd?: boolean;
  inputMode?: EditorInputMode;
  viewMode?: EditorViewMode;
  onViewModeChange?: (id: string, mode: EditorViewMode) => void;
  onCommentSelect?: (id: string) => void;
  onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
  role?: string;
  coordinate?: LayoutCoordinate;
} & Pick<UseTextEditorProps, 'initialValue' | 'selection' | 'scrollTo' | 'extensions'> &
  Partial<Pick<MarkdownPluginState, 'extensionProviders'>>;

export const MarkdownEditor = ({
  id,
  initialValue,
  onFileUpload,
  viewMode = 'preview',
  onViewModeChange,
  toolbar,
  scrollTo,
  selection,
  scrollPastEnd,
  extensions: propsExtensions,
  extensionProviders = [],
  onCommentSelect,
  role = 'article',
}: MarkdownEditorProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const { themeMode } = useThemeContext();
  const attentionPlugin = useResolvePlugin(parseAttentionPlugin);
  const layoutPlugin = useResolvePlugin(parseLayoutPlugin);
  const attended = Array.from(attentionPlugin?.provides.attention?.attended ?? []);
  const isDirectlyAttended = attended.length === 1 && attended[0] === id;

  const [formattingState, formattingObserver] = useFormattingState();

  // TODO(Zan): Move these into thread plugin as well?
  const [commentsState, commentObserver] = useCommentState();
  const commentClickObserver = useCommentClickListener((id) => {
    onCommentSelect?.(id);
  });

  const handleDrop: DNDOptions['onDrop'] = async (view, { files }) => {
    const file = files[0];
    const info = file && onFileUpload ? await onFileUpload(file) : undefined;

    if (info) {
      processAction(view, { type: 'image', data: info.url });
    }
  };

  const providerExtensions = useMemo(
    () =>
      extensionProviders.reduce((acc: Extension[], provider) => {
        const provided = typeof provider === 'function' ? provider({}) : provider;
        acc.push(...provided);
        return acc;
      }, []),
    [extensionProviders],
  );

  const extensions = useMemo(() => {
    return [
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
        slots: {
          editor: {
            className: editorScroller,
          },
        },
      }),
      role !== 'section' && onFileUpload ? dropFile({ onDrop: handleDrop }) : [],
      providerExtensions,
      propsExtensions,
    ].filter(nonNullable);
  }, [propsExtensions, formattingObserver, viewMode, themeMode]);

  const {
    parentRef,
    view: editorView,
    focusAttributes,
  } = useTextEditor(
    () => ({
      initialValue,
      extensions,
      ...(role !== 'section' && {
        id,
        selection,
        scrollTo,
        // TODO(wittjosiah): Autofocus based on layout is racey.
        autoFocus: layoutPlugin?.provides.layout ? layoutPlugin?.provides.layout.scrollIntoView === id : true,
        moveToEndOfLine: true,
      }),
    }),
    [id, extensions, initialValue, selection, scrollTo],
  );

  useTest(editorView);

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

  const handleToolbarAction = useActionHandler(editorView);

  const handleAction = (action: Action) => {
    if (action.type === 'view-mode') {
      onViewModeChange?.(id, action.data);
    }

    handleToolbarAction?.(action);
  };

  const attentionFragment = mx(
    'group-focus-within/editor:attention-surface group-[[aria-current]]/editor:attention-surface',
    'group-focus-within/editor:separator-separator',
  );

  return (
    <div
      role='none'
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
              // TODO(burdon): FIX: Sections clip focus ring.
              role === 'section'
                ? ['z-[2] group-focus-within/section:visible', !attended && 'invisible', sectionToolbarLayout]
                : [
                    // TODO(burdon): Toolbar width should use same variable as the document width.
                    // 'max-is-[60rem] justify-self-center',
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
            <Toolbar.View mode={viewMode} />
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

export default MarkdownEditor;
