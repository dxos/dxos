//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import type * as Atom from 'effect/reactivity/Atom';
import React, { type ReactNode, useCallback, useMemo, useState } from 'react';

import { INITIAL_FOCUS_ATTRIBUTE } from '@dxos/react-focus';
import { createContext } from '@dxos/react-hooks';
import {
  type EditorRootProps,
  type EditorToolbarState,
  createEditorController,
  useEditorContext,
} from '@dxos/react-ui-editor';
import * as Banner from '@dxos/react-ui/Banner';
import * as Hooks from '@dxos/react-ui/Hooks';
import type * as Util from '@dxos/react-ui/Util';
import { type WidgetState } from '@dxos/ui-editor';
import { Merge, isNonNullable } from '@dxos/util';

import {
  type ContentStatus,
  type DocumentType,
  type ExtensionsOptions,
  type UseEditorMenuOptionsProps,
  useDocumentContent,
  useEditorMenuOptions,
  useExtensions,
} from '#hooks';

import { MarkdownNamespace } from '../../namespace.ts';
import {
  MarkdownEditorContent as NaturalMarkdownEditorContent,
  type MarkdownEditorContentProps as NaturalMarkdownEditorContentProps,
} from './MarkdownEditorContent.tsx';
import {
  MarkdownEditorToolbar as NaturalMarkdownToolbar,
  type MarkdownEditorToolbarProps as NaturalMarkdownToolbarProps,
} from './MarkdownEditorToolbar.tsx';

//
// Context
//

type MarkdownEditorContextValue = Merge<
  {
    id: string;
    attendableId?: string;
    contentStatus?: ContentStatus;
  },
  Pick<ExtensionsOptions, 'compact' | 'viewMode' | 'editorStateStore'>,
  Pick<NaturalMarkdownToolbarProps, 'onAction' | 'onFileUpload' | 'onViewModeChange'>
>;

const [MarkdownEditorContextProvider, useMarkdownEditorContext] =
  createContext<MarkdownEditorContextValue>('MarkdownEditor.Context');

/**
 * Props to spread onto `Editor.Root` from `MarkdownEditorProvider`'s render callback.
 */
export type MarkdownEditorEditorRootProps = Omit<EditorRootProps, 'children'>;

//
// MarkdownEditorProvider
//

export type MarkdownEditorProviderProps = Merge<
  {
    object?: DocumentType;
    extensions?: Extension[];
    children: (editorRootProps: MarkdownEditorEditorRootProps) => ReactNode;
  },
  Pick<
    MarkdownEditorContextValue,
    'id' | 'attendableId' | 'viewMode' | 'compact' | 'onAction' | 'onFileUpload' | 'onViewModeChange'
  >,
  Pick<UseEditorMenuOptionsProps, 'slashCommandGroups' | 'onLinkQuery'>,
  Pick<ExtensionsOptions, 'editorStateStore' | 'viewState' | 'settings' | 'identity' | 'onSelectLink'>
>;

/**
 * Builds the editor's extensions and menu options and shares them with `MarkdownEditor.Content` and
 * `MarkdownEditor.Toolbar`. `attendableId` reaches the extensions so inline embeds nest under it.
 */
export const MarkdownEditorProvider = ({
  children,
  id,
  attendableId,
  object,
  settings,
  compact,
  viewMode,
  viewState,
  editorStateStore,
  extensions: extensionsProp,
  slashCommandGroups,
  identity,
  onLinkQuery,
  onSelectLink,
  onAction,
  onFileUpload,
  onViewModeChange,
}: MarkdownEditorProviderProps) => {
  // Widget portals driven by xmlTags.
  const [widgets, setWidgets] = useState<WidgetState[]>([]);

  // Context menu options (Editor.Root calls useEditorMenu with these props).
  const menuOptions = useEditorMenuOptions({ slashCommandGroups, onLinkQuery });

  const content = useDocumentContent(object);
  const contentStatus = content.status;

  // Core markdown extensions (popover/menu extension is added by Editor.Root).
  const coreExtensions = useExtensions({
    id,
    attendableId,
    object,
    content,
    compact,
    viewMode,
    viewState,
    editorStateStore,
    setWidgets,
    settings,
    identity,
    onSelectLink,
  });

  const extensions = useMemo(
    () => [coreExtensions, extensionsProp].filter(isNonNullable).flat(),
    [coreExtensions, extensionsProp],
  );

  const editorRootProps = useMemo<MarkdownEditorEditorRootProps>(
    () => ({
      extensions,
      widgets,
      viewMode,
      getMenu: menuOptions.getMenu,
      trigger: menuOptions.trigger,
      placeholder: menuOptions.placeholder,
      multiWordTriggers: menuOptions.multiWordTriggers,
      ...(menuOptions.filter !== undefined ? { filter: menuOptions.filter } : {}),
      ...(menuOptions.triggerKey !== undefined ? { triggerKey: menuOptions.triggerKey } : {}),
    }),
    [extensions, widgets, viewMode, menuOptions],
  );

  const markdownContextValue = useMemo<MarkdownEditorContextValue>(
    () => ({
      id,
      attendableId,
      contentStatus,
      compact,
      viewMode,
      editorStateStore,
      onAction,
      onFileUpload,
      onViewModeChange,
    }),
    [id, attendableId, contentStatus, compact, viewMode, editorStateStore, onAction, onFileUpload, onViewModeChange],
  );

  return (
    <MarkdownEditorContextProvider {...markdownContextValue}>{children(editorRootProps)}</MarkdownEditorContextProvider>
  );
};

MarkdownEditorProvider.displayName = 'MarkdownEditor.Provider';

//
// MarkdownEditor.Content
//

const MARKDOWN_EDITOR_CONTENT_NAME = 'MarkdownEditor.Content';

type MarkdownEditorContentProps = Omit<
  NaturalMarkdownEditorContentProps,
  'id' | 'extensions' | 'toolbarState' | 'editorStateStore'
>;

const unavailableMessages = {
  missing: { title: 'content-missing.title', message: 'content-missing.message' },
  deleted: { title: 'content-deleted.title', message: 'content-deleted.message' },
} as const;

const MarkdownEditorContent = ({ compact: compactProp, ...props }: MarkdownEditorContentProps) => {
  const { t } = Hooks.useTranslation(MarkdownNamespace.key);
  const {
    id,
    attendableId,
    contentStatus,
    compact = compactProp,
    viewMode,
    editorStateStore,
    onFileUpload,
  } = useMarkdownEditorContext(MARKDOWN_EDITOR_CONTENT_NAME);
  const { extensions, setController, state } = useEditorContext(MARKDOWN_EDITOR_CONTENT_NAME);

  const handleRef = useCallback(
    (view: EditorView | null) => {
      setController(createEditorController(view));
    },
    [setController],
  );

  // Missing or deleted content has nothing to edit: say why in place of the editor.
  if (contentStatus === 'missing' || contentStatus === 'deleted') {
    const { title, message } = unavailableMessages[contentStatus];
    return (
      // Entering the article lands on the explanation; the tab stop sits inside the mark, as an editor's does.
      <div {...{ [INITIAL_FOCUS_ATTRIBUTE]: '' }}>
        <div tabIndex={0} className='dx-focus-ring'>
          <Banner.Root valence='warning' data-testid='markdown.content-status' data-status={contentStatus}>
            <Banner.Title>{t(title)}</Banner.Title>
            <Banner.Body>{t(message)}</Banner.Body>
          </Banner.Root>
        </div>
      </div>
    );
  }

  return (
    <NaturalMarkdownEditorContent
      // Spread directly: both sides speak `classNames`; `composableProps` here converted it to a
      // DOM `className` the inner component never reads, dropping the caller's classes.
      {...props}
      id={id}
      attendableId={attendableId}
      compact={compact}
      viewMode={viewMode}
      loading={contentStatus === 'loading'}
      editorStateStore={editorStateStore}
      toolbarState={state as Atom.Writable<EditorToolbarState>}
      extensions={extensions}
      onFileUpload={onFileUpload}
      ref={handleRef}
    />
  );
};

MarkdownEditorContent.displayName = MARKDOWN_EDITOR_CONTENT_NAME;

//
// MarkdownEditor.Toolbar
//

const MARKDOWN_EDITOR_TOOLBAR_NAME = 'MarkdownEditor.Toolbar';

type MarkdownEditorToolbarProps = Util.ThemedClassName<
  Omit<NaturalMarkdownToolbarProps, 'getView' | 'onAction' | 'onFileUpload' | 'onViewModeChange' | 'id'>
>;

const MarkdownEditorToolbar = (props: MarkdownEditorToolbarProps) => {
  const { id, attendableId, onAction, onFileUpload, onViewModeChange } =
    useMarkdownEditorContext(MARKDOWN_EDITOR_TOOLBAR_NAME);

  const { controller } = useEditorContext(MARKDOWN_EDITOR_TOOLBAR_NAME);

  // Stable getter identity (changes only when the controller does) so the FileUpload effect, whose
  // deps include `getView`, does not re-run every render and re-upload the same file.
  const getView = useCallback(() => controller?.view ?? null, [controller]);

  return (
    <NaturalMarkdownToolbar
      {...props}
      id={attendableId ?? id}
      getView={getView}
      onAction={onAction}
      onFileUpload={onFileUpload}
      onViewModeChange={onViewModeChange}
    />
  );
};

MarkdownEditorToolbar.displayName = MARKDOWN_EDITOR_TOOLBAR_NAME;

//
// MarkdownEditor
//

// NOTE: Embedded-block portals are rendered by `Editor.Blocks` (react-ui-editor); widgets are passed
// to `Editor.Root` via `editorRootProps`.

/** @private */
export const MarkdownEditor = {
  Content: MarkdownEditorContent,
  Toolbar: MarkdownEditorToolbar,
};

export type { MarkdownEditorContentProps, MarkdownEditorToolbarProps };
