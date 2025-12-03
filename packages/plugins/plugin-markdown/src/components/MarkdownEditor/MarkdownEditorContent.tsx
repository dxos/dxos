//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';

import { type Live } from '@dxos/live-object';
import { type ThemedClassName, useDynamicRef, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type EditorMenuGroup,
  type EditorSelectionState,
  type EditorStateStore,
  type EditorToolbarState,
  type EditorViewMode,
  type ThemeExtensionsOptions,
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
import { mx } from '@dxos/react-ui-theme';
import { isTruthy } from '@dxos/util';

import { useSelectCurrentThread } from '../../hooks';
import { meta } from '../../meta';

import { type MarkdownEditorToolbarProps } from './MarkdownEditorToolbar';

export type MarkdownEditorContentProps = ThemedClassName<{
  id: string;
  role?: string;
  viewMode?: EditorViewMode;
  scrollPastEnd?: boolean;
  slashCommandGroups?: EditorMenuGroup[];
  editorStateStore?: EditorStateStore;
  toolbarState?: Live<EditorToolbarState>;
  onLinkQuery?: (query?: string) => Promise<EditorMenuGroup[]>;
}> &
  // prettier-ignore
  Pick<UseTextEditorProps, 'initialValue' | 'extensions'> &
  Pick<MarkdownEditorToolbarProps, 'onFileUpload'> &
  Pick<ThemeExtensionsOptions, 'slots'>;

export const MarkdownEditorContent = forwardRef<EditorView | null, MarkdownEditorContentProps>(
  (
    {
      classNames,
      id,
      role,
      viewMode,
      initialValue,
      editorStateStore,
      toolbarState,
      extensions,
      scrollPastEnd,
      slots = editorSlots,
      onFileUpload,
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.id);
    const { themeMode } = useThemeContext();

    // TODO(burdon): Toolbar state is not reactive.
    const toolbarStateRef = useDynamicRef(toolbarState);

    // Restore last selection and scroll point.
    const { scrollTo, selection } = useMemo<EditorSelectionState>(() => editorStateStore?.getState(id) ?? {}, [id]);

    const {
      parentRef,
      view: editorView,
      focusAttributes,
    } = useTextEditor(
      () => ({
        ...(role !== 'section' && {
          id,
          scrollTo,
          selection,
          // TODO(wittjosiah): Autofocus based on layout is racy.
          // autoFocus: layoutPlugin?.provides.layout ? layoutPlugin?.provides.layout.scrollIntoView === id : true,
          selectionEnd: true,
        }),
        initialValue,
        extensions: [
          createBasicExtensions({
            readOnly: viewMode === 'readonly',
            placeholder: t('editor placeholder'),
            scrollPastEnd: scrollPastEnd && role !== 'section',
            search: true,
          }),
          createThemeExtensions({
            themeMode,
            slots,
            syntaxHighlighting: true,
          }),
          createMarkdownExtensions(),
          formattingListener(() => toolbarStateRef.current),
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
          extensions,
        ].filter(isTruthy),
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
        className={mx(stackItemContentEditorClassNames(role), classNames)}
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
