//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useMemo, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

import { createIntent, type FileInfo, useIntentDispatcher } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { ATTENDABLE_PATH_SEPARATOR, DeckAction } from '@dxos/plugin-deck/types';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type DNDOptions,
  type EditorViewMode,
  type EditorInputMode,
  type EditorSelectionState,
  type EditorStateStore,
  EditorToolbar,
  type UseTextEditorProps,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  dropFile,
  editorContent,
  editorGutter,
  processEditorPayload,
  stackItemContentEditorClassNames,
  useCommentState,
  useCommentClickListener,
  useFormattingState,
  useTextEditor,
  useEditorToolbarState,
  addLink,
} from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { isNotFalsy, isNonNullable } from '@dxos/util';

import { useSelectCurrentThread } from '../../hooks';
import { MARKDOWN_PLUGIN } from '../../meta';
import { type MarkdownPluginState } from '../../types';

export type MarkdownEditorProps = {
  id: string;
  role?: string;
  inputMode?: EditorInputMode;
  scrollPastEnd?: boolean;
  toolbar?: boolean;
  // TODO(wittjosiah): Generalize custom toolbar actions (e.g. comment, upload, etc.)
  comment?: boolean;
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
  comment = true,
  viewMode,
  editorStateStore,
  onFileUpload,
  onViewModeChange,
}: MarkdownEditorProps) => {
  const { t } = useTranslation(MARKDOWN_PLUGIN);
  const { themeMode } = useThemeContext();
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const toolbarState = useEditorToolbarState({ viewMode });
  const formattingObserver = useFormattingState(toolbarState);

  // Restore last selection and scroll point.
  const { scrollTo, selection } = useMemo<EditorSelectionState>(() => editorStateStore?.getState(id) ?? {}, [id]);

  // Extensions from other plugins.
  // TODO(burdon): Reconcile with DocumentEditor.useExtensions.
  const providerExtensions = useMemo(
    () => extensionProviders?.flatMap((provider) => provider({})).filter(isNonNullable),
    [extensionProviders],
  );

  // TODO(Zan): Factor out to thread plugin.
  const commentObserver = useCommentState(toolbarState);
  const onCommentClick = useCallback(async () => {
    await dispatch(
      createIntent(DeckAction.ChangeCompanion, {
        primary: id,
        companion: `${id}${ATTENDABLE_PATH_SEPARATOR}comments`,
      }),
    );
  }, [dispatch]);
  const commentClickObserver = useCommentClickListener(onCommentClick);

  // TODO(wittjosiah): Factor out to file uploader plugin.
  // Drag files.
  const handleDrop: DNDOptions['onDrop'] = async (view, { files }) => {
    const file = files[0];
    const info = file && onFileUpload ? await onFileUpload(file) : undefined;
    if (info) {
      processEditorPayload(view, { type: 'image', data: info.url });
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
        comment && commentObserver,
        comment && commentClickObserver,
        createBasicExtensions({
          readOnly: viewMode === 'readonly',
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
    [id, formattingObserver, comment, viewMode, themeMode, extensions, providerExtensions],
  );

  useTest(editorView);
  useSelectCurrentThread(editorView, id);

  // https://react-dropzone.js.org/#src
  const { acceptedFiles, getInputProps, open } = useDropzone({
    multiple: false,
    noDrag: true,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif'],
    },
  });

  useEffect(() => {
    if (editorView && onFileUpload && acceptedFiles.length) {
      requestAnimationFrame(async () => {
        // NOTE: Clone file since react-dropzone patches in a non-standard `path` property, which confuses IPFS.
        const f = acceptedFiles[0];
        const file = new File([f], f.name, {
          type: f.type,
          lastModified: f.lastModified,
        });

        const info = await onFileUpload(file);
        if (info) {
          addLink({ url: info.url, image: true })(editorView);
        }
      });
    }
  }, [acceptedFiles, editorView, onFileUpload]);

  const getView = useCallback(() => {
    invariant(editorView);
    return editorView;
  }, [editorView]);

  const handleViewModeChange = useCallback(
    (mode: EditorViewMode) => onViewModeChange?.(id, mode),
    [id, onViewModeChange],
  );

  const handleImageUpload = useCallback(() => {
    if (onFileUpload) {
      open();
    }
  }, [onFileUpload]);

  return (
    <StackItem.Content toolbar={!!toolbar}>
      {toolbar && (
        <>
          <EditorToolbar
            attendableId={id}
            role={role}
            state={toolbarState}
            getView={getView}
            comment={comment}
            image={handleImageUpload}
            viewMode={handleViewModeChange}
          />
          <input {...getInputProps()} />
        </>
      )}
      <div
        role='none'
        ref={parentRef}
        data-testid='composer.markdownRoot'
        data-toolbar={toolbar ? 'enabled' : 'disabled'}
        className={stackItemContentEditorClassNames(role)}
        data-popover-collision-boundary={true}
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
