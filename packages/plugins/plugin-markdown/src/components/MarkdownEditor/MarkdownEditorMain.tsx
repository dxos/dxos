//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';

import { useDynamicRef, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type EditorSelectionState,
  type EditorStateStore,
  type EditorToolbarActionGraphProps,
  type EditorViewMode,
  type PopoverMenuGroup,
  type UseTextEditorProps,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  dropFile,
  editorGutter,
  editorSlots,
  formattingListener,
  processEditorPayload,
  stackItemContentEditorClassNames,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { isTruthy } from '@dxos/util';

import { useSelectCurrentThread } from '../../hooks';
import { meta } from '../../meta';

import { type MarkdownEditorToolbarProps } from './MarkdownEditorToolbar';

export type MarkdownEditorMainProps = {
  id: string;
  role?: string;
  toolbar?: boolean;
  viewMode?: EditorViewMode;
  scrollPastEnd?: boolean;
  slashCommandGroups?: PopoverMenuGroup[];
  customActions?: EditorToolbarActionGraphProps['customActions'];
  editorStateStore?: EditorStateStore;
  toolbarState?: MarkdownEditorToolbarProps['state'];
  onLinkQuery?: (query?: string) => Promise<PopoverMenuGroup[]>;
} & (Pick<UseTextEditorProps, 'initialValue' | 'extensions'> & Pick<MarkdownEditorToolbarProps, 'onFileUpload'>);

export const MarkdownEditorMain = forwardRef<EditorView | null, MarkdownEditorMainProps>(
  (
    {
      id,
      role,
      toolbar,
      initialValue,
      editorStateStore,
      toolbarState,
      extensions,
      scrollPastEnd,
      viewMode,
      onFileUpload,
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();
    const toolbarStateRef = useDynamicRef(toolbarState);

    // Restore last selection and scroll point.
    const { scrollTo, selection } = useMemo<EditorSelectionState>(() => editorStateStore?.getState(id) ?? {}, [id]);

    const {
      parentRef,
      view: editorView,
      focusAttributes,
    } = useTextEditor(
      () => ({
        initialValue,
        extensions: [
          createBasicExtensions({
            readOnly: viewMode === 'readonly',
            placeholder: t('editor placeholder'),
            scrollPastEnd: role === 'section' ? false : scrollPastEnd,
            search: true,
          }),
          createMarkdownExtensions(),
          createThemeExtensions({ themeMode, syntaxHighlighting: true, slots: editorSlots }),
          editorGutter,
          role !== 'section' &&
            onFileUpload &&
            dropFile({
              // TODO(wittjosiah): Factor out to file uploader plugin.
              onDrop: async (view, { files }) => {
                const file = files[0];
                const info = file && onFileUpload ? await onFileUpload(file) : undefined;
                if (info) {
                  processEditorPayload(view, { type: 'image', data: info.url });
                }
              },
            }),
          // TODO(wittjosiah): Generalize custom toolbar actions (e.g. comment, upload, etc.)
          formattingListener(() => toolbarStateRef.current),
          extensions,
        ].filter(isTruthy),
        ...(role !== 'section' && {
          id,
          scrollTo,
          selection,
          // TODO(wittjosiah): Autofocus based on layout is racy.
          // autoFocus: layoutPlugin?.provides.layout ? layoutPlugin?.provides.layout.scrollIntoView === id : true,
          moveToEndOfLine: true,
        }),
      }),
      [id, viewMode, themeMode, extensions],
    );

    useImperativeHandle<EditorView | null, EditorView | null>(forwardedRef, () => editorView, [editorView]);
    useSelectCurrentThread(editorView, id);
    useTest(editorView);

    return (
      <div
        role='none'
        ref={parentRef}
        data-testid='composer.markdownRoot'
        // TODO(burdon): Is this required here or can it be moved to the root?
        data-toolbar={toolbar ? 'enabled' : 'disabled'}
        className={stackItemContentEditorClassNames(role)}
        data-popover-collision-boundary={true}
        {...focusAttributes}
      />
    );
  },
);

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
