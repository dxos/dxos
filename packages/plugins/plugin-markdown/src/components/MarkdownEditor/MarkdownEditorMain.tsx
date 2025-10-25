//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';

import { type FileInfo } from '@dxos/app-framework';
import { Domino, toLocalizedString, useThemeContext, useTranslation } from '@dxos/react-ui';
import {
  type DNDOptions,
  type EditorInputMode,
  type EditorSelectionState,
  type EditorStateStore,
  type EditorToolbarActionGraphProps,
  type EditorViewMode,
  type PopoverMenuGroup,
  PopoverMenuProvider,
  type UsePopoverMenuProps,
  type UseTextEditorProps,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  dropFile,
  editorGutter,
  editorSlots,
  filterMenuGroups,
  formattingCommands,
  linkSlashCommands,
  processEditorPayload,
  stackItemContentEditorClassNames,
  useEditorToolbarState,
  useFormattingState,
  usePopoverMenu,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { StackItem } from '@dxos/react-ui-stack';
import { isNonNullable, isTruthy } from '@dxos/util';

import { useSelectCurrentThread } from '../../hooks';
import { meta } from '../../meta';
import { type MarkdownPluginState } from '../../types';

import { MarkdownToolbar } from './MarkdownToolbar';

export type MarkdownEditorProps = {
  id: string;
  role?: string;
  toolbar?: boolean;
  inputMode?: EditorInputMode;
  scrollPastEnd?: boolean;
  slashCommandGroups?: PopoverMenuGroup[];
  customActions?: EditorToolbarActionGraphProps['customActions'];
  // TODO(wittjosiah): Generalize custom toolbar actions (e.g. comment, upload, etc.)
  viewMode?: EditorViewMode;
  editorStateStore?: EditorStateStore;
  onViewModeChange?: (id: string, mode: EditorViewMode) => void;
  onLinkQuery?: (query?: string) => Promise<PopoverMenuGroup[]>;
  onFileUpload?: (file: File) => Promise<FileInfo | undefined>;
} & (Pick<UseTextEditorProps, 'initialValue' | 'extensions'> &
  Partial<Pick<MarkdownPluginState, 'extensionProviders'>>);

// TODO(burdon): Create radix-style components.

/**
 * Base markdown editor component.
 * This component provides all the features of the markdown editor that do no depend on ECHO.
 * This allows it to be used as a common editor for markdown content on arbitrary backends (e.g. files).
 */
export const MarkdownEditor = ({
  id,
  role,
  extensions: extensionsParam,
  slashCommandGroups,
  customActions,
  viewMode,
  onFileUpload,
  onViewModeChange,
  onLinkQuery,
  ...props
}: MarkdownEditorProps) => {
  const { t } = useTranslation();
  const viewRef = useRef<EditorView>(null);

  const getMenu = useCallback<NonNullable<UsePopoverMenuProps['getMenu']>>(
    ({ text, trigger }) => {
      switch (trigger) {
        case '@': {
          return onLinkQuery?.(text) ?? [];
        }

        case '/':
        default: {
          return filterMenuGroups([formattingCommands, linkSlashCommands, ...(slashCommandGroups ?? [])], (item) =>
            text ? toLocalizedString(item.label, t).toLowerCase().includes(text.toLowerCase()) : true,
          );
        }
      }
    },
    [slashCommandGroups, onLinkQuery],
  );

  const menuOptions = useMemo<UsePopoverMenuProps>(() => {
    const trigger = onLinkQuery ? ['/', '@'] : ['/'];
    const placeholder = {
      delay: 3_000,
      content: () =>
        Domino.of('div')
          .children(
            Domino.of('span').text('Press'),
            ...trigger.map((text) =>
              Domino.of('span')
                .classNames('mx-1 px-1.5 pt-[1px] pb-[2px] border border-separator rounded-sm')
                .text(text),
            ),
            Domino.of('span').text('for commands.'),
          )
          .build(),
    };

    return { viewRef, getMenu, trigger, placeholder };
  }, [getMenu, onLinkQuery]);

  const { groupsRef, extension, ...commandMenuProps } = usePopoverMenu(menuOptions);
  const extensions = useMemo(() => [extensionsParam, extension].filter(isTruthy), [extensionsParam, extension]);

  return (
    <StackItem.Content toolbar={!!toolbar}>
      <PopoverMenuProvider view={viewRef.current} groups={groupsRef.current} {...commandMenuProps}>
        {/* TODO(burdon): Move toolbar to container. */}
        {toolbar && viewRef.current && (
          <MarkdownToolbar
            id={id}
            role={role}
            editorView={viewRef.current}
            viewMode={viewMode}
            customActions={customActions}
            onFileUpload={onFileUpload}
            onViewModeChange={onViewModeChange}
          />
        )}
        <MarkdownEditorMain
          ref={viewRef}
          id={id}
          role={role}
          extensions={extensions}
          viewMode={viewMode}
          onFileUpload={onFileUpload}
          {...props}
        />
      </PopoverMenuProvider>
    </StackItem.Content>
  );
};

const MarkdownEditorMain = forwardRef<EditorView | null, MarkdownEditorProps>(
  (
    {
      id,
      role = 'article',
      initialValue,
      editorStateStore,
      extensions,
      extensionProviders,
      scrollPastEnd,
      toolbar,
      viewMode,
      onFileUpload,
    },
    forwardedRef,
  ) => {
    const { t } = useTranslation(meta.id);
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
            search: true,
          }),
          createMarkdownExtensions(),
          createThemeExtensions({ themeMode, syntaxHighlighting: true, slots: editorSlots }),
          editorGutter,
          role !== 'section' && onFileUpload && dropFile({ onDrop: handleDrop }),
          providerExtensions,
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
      [id, formattingObserver, viewMode, themeMode, extensions, providerExtensions],
    );

    useImperativeHandle<EditorView | null, EditorView | null>(forwardedRef, () => editorView, [editorView]);
    useSelectCurrentThread(editorView, id);
    useTest(editorView);

    return (
      <div
        role='none'
        ref={parentRef}
        data-testid='composer.markdownRoot'
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
