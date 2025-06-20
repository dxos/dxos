//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { useMemo, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { useDropzone } from 'react-dropzone';

import { type FileInfo } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  addLink,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  dropFile,
  editorGutter,
  editorSlots,
  EditorToolbar,
  processEditorPayload,
  RefPopover,
  stackItemContentEditorClassNames,
  type DNDOptions,
  type EditorInputMode,
  type EditorSelectionState,
  type EditorStateStore,
  type EditorToolbarActionGraphProps,
  type EditorViewMode,
  type CommandMenuGroup,
  type UseTextEditorProps,
  useEditorToolbarState,
  useFormattingState,
  useCommandMenu,
  useTextEditor,
  filterItems,
  coreSlashCommands,
  CommandMenu,
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
  slashCommandGroups?: CommandMenuGroup[];
  toolbar?: boolean;
  customActions?: EditorToolbarActionGraphProps['customActions'];
  // TODO(wittjosiah): Generalize custom toolbar actions (e.g. comment, upload, etc.)
  viewMode?: EditorViewMode;
  editorStateStore?: EditorStateStore;
  onViewModeChange?: (id: string, mode: EditorViewMode) => void;
  onLinkQuery?: (query?: string) => Promise<CommandMenuGroup[]>;
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
  extensions: _extensions,
  slashCommandGroups,
  onLinkQuery,
  ...props
}: MarkdownEditorProps) => {
  const viewRef = useRef<EditorView>();
  const getGroups = useCallback(
    (trigger: string, query?: string) => {
      switch (trigger) {
        case '@':
          return onLinkQuery?.(query) ?? [];
        case '/':
        default:
          return filterItems([coreSlashCommands, ...(slashCommandGroups ?? [])], (item) =>
            query ? item.label.toLowerCase().includes(query.toLowerCase()) : true,
          );
      }
    },
    [onLinkQuery, slashCommandGroups],
  );
  const { commandMenu, groupsRef, currentItem, onSelect, ...refPopoverProps } = useCommandMenu({
    viewRef,
    getGroups,
    trigger: onLinkQuery ? ['/', '@'] : '/',
  });
  const extensions = useMemo(() => [_extensions, commandMenu].filter(isNotFalsy), [_extensions, commandMenu]);

  return (
    <RefPopover modal={false} {...refPopoverProps}>
      <MarkdownEditorImpl ref={viewRef} {...props} extensions={extensions} />
      <CommandMenu groups={groupsRef.current} currentItem={currentItem} onSelect={onSelect} />
    </RefPopover>
  );
};

const MarkdownEditorImpl = forwardRef<EditorView | undefined, MarkdownEditorProps>(
  (
    {
      id,
      role = 'article',
      initialValue,
      extensions,
      extensionProviders,
      scrollPastEnd,
      toolbar,
      customActions,
      viewMode,
      editorStateStore,
      onFileUpload,
      onViewModeChange,
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(MARKDOWN_PLUGIN);
    const { themeMode } = useThemeContext();
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
          createBasicExtensions({
            readOnly: viewMode === 'readonly',
            placeholder: t('editor placeholder'),
            scrollPastEnd: role === 'section' ? false : scrollPastEnd,
          }),
          createMarkdownExtensions({ themeMode }),
          createThemeExtensions({ themeMode, syntaxHighlighting: true, slots: editorSlots }),
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

    useImperativeHandle(forwardedRef, () => editorView, [editorView]);
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
              customActions={customActions}
              getView={getView}
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
  },
);

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
