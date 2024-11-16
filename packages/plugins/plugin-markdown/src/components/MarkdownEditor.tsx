//
// Copyright 2023 DXOS.org
//

import { openSearchPanel } from '@codemirror/search';
import { type EditorView } from '@codemirror/view';
import React, { useMemo, useEffect, useCallback } from 'react';

import { type FileInfo, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import {
  type Action,
  type DNDOptions,
  type EditorViewMode,
  type EditorInputMode,
  type EditorSelectionState,
  type EditorStateStore,
  Toolbar,
  type UseTextEditorProps,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  dropFile,
  editorContent,
  editorGutter,
  processAction,
  useActionHandler,
  useCommentState,
  useCommentClickListener,
  useFormattingState,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { mx, textBlockWidth } from '@dxos/react-ui-theme';
import { isNotFalsy, nonNullable } from '@dxos/util';

import { useSelectCurrentThread } from '../hooks';
import { MARKDOWN_PLUGIN } from '../meta';
import { type MarkdownPluginState } from '../types';

const DEFAULT_VIEW_MODE: EditorViewMode = 'preview';

export type MarkdownEditorProps = {
  id: string;
  role?: string;
  inputMode?: EditorInputMode;
  scrollPastEnd?: boolean;
  toolbar?: boolean;
  viewMode?: EditorViewMode;
  editorStateStore?: EditorStateStore;
  onViewModeChange?: (id: string, mode: EditorViewMode) => void;
  onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
} & Pick<UseTextEditorProps, 'initialValue' | 'extensions'> &
  Partial<Pick<MarkdownPluginState, 'extensionProviders'>>;

/**
 * Base markdown editor component.
 *
 * This component provides all the features of the markdown editor that do no depend on ECHO.
 * This allows it to be used as a common editor for markdown content on arbitrary backends (e.g. files).
 */
export const MarkdownEditor = ({
  id,
  role = 'article',
  initialValue,
  extensions,
  extensionProviders,
  scrollPastEnd,
  toolbar,
  viewMode,
  editorStateStore,
  onFileUpload,
  onViewModeChange,
}: MarkdownEditorProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const { themeMode } = useThemeContext();
  const dispatch = useIntentDispatcher();
  const [formattingState, formattingObserver] = useFormattingState();
  const { hasAttention } = useAttention(id);

  // Restore last selection and scroll point.
  const { scrollTo, selection } = useMemo<EditorSelectionState>(() => editorStateStore?.getState(id) ?? {}, [id]);

  // Extensions from other plugins.
  // TODO(burdon): Reconcile with DocumentEditor.useExtensions.
  const providerExtensions = useMemo(
    () => extensionProviders?.flatMap((provider) => provider({})).filter(nonNullable),
    [extensionProviders],
  );

  // TODO(Zan): Move these into thread plugin as well?
  const [commentsState, commentObserver] = useCommentState();
  const onCommentClick = useCallback(() => {
    void dispatch({
      action: LayoutAction.SET_LAYOUT,
      data: { element: 'complementary', state: true },
    });
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
        // autoFocus: layoutPlugin?.provides.layout ? layoutPlugin?.provides.layout.scrollIntoView === id : true,
        moveToEndOfLine: true,
      }),
    }),
    [id, formattingObserver, viewMode, themeMode, extensions, providerExtensions],
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
    <StackItem.Content toolbar={toolbar} contentSize={role === 'article' ? 'cover' : 'intrinsic'}>
      {toolbar && (
        <div
          role='none'
          className={mx(
            'attention-surface is-full',
            role === 'section' && 'sticky block-start-0 z-[1] border-be !border-separator -mbe-px',
          )}
        >
          <Toolbar.Root
            classNames={[textBlockWidth, !hasAttention && 'opacity-20']}
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
        className={mx(
          'ch-focus-ring-inset data-[toolbar=disabled]:pbs-2 attention-surface',
          role === 'article' ? 'min-bs-0' : '[&_.cm-scroller]:overflow-hidden [&_.cm-scroller]:min-bs-24',
        )}
        {...focusAttributes}
      />
    </StackItem.Content>
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
