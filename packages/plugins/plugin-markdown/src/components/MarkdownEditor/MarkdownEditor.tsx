//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { type Atom } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type ReactNode, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { type ThemedClassName, composable, composableProps } from '@dxos/react-ui';
import {
  type EditorRootProps,
  type EditorToolbarState,
  createEditorController,
  useEditorContext,
} from '@dxos/react-ui-editor';
import { type XmlWidgetState } from '@dxos/ui-editor';
import { Merge, isNonNullable } from '@dxos/util';

import {
  type DocumentType,
  type ExtensionsOptions,
  type UseEditorMenuOptionsProps,
  useEditorMenuOptions,
  useExtensions,
} from '#hooks';

import {
  MarkdownEditorContent as NaturalMarkdownEditorContent,
  type MarkdownEditorContentProps as NaturalMarkdownEditorContentProps,
} from './MarkdownEditorContent';
import {
  MarkdownEditorToolbar as NaturalMarkdownToolbar,
  type MarkdownEditorToolbarProps as NaturalMarkdownToolbarProps,
} from './MarkdownEditorToolbar';

//
// Context
//

type MarkdownEditorContextValue = Merge<
  {
    id: string;
    attendableId?: string;
    widgets: XmlWidgetState[];
  },
  Pick<ExtensionsOptions, 'compact' | 'viewMode'>,
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
  Pick<ExtensionsOptions, 'editorStateStore' | 'viewState' | 'settings' | 'identity' | 'onSelectObject'>
>;

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
  onSelectObject,
  onAction,
  onFileUpload,
  onViewModeChange,
}: MarkdownEditorProviderProps) => {
  // Widget portals driven by xmlTags.
  const [widgets, setWidgets] = useState<XmlWidgetState[]>([]);

  // Context menu options (Editor.Root calls useEditorMenu with these props).
  const menuOptions = useEditorMenuOptions({ slashCommandGroups, onLinkQuery });

  // Core markdown extensions (popover/menu extension is added by Editor.Root).
  const coreExtensions = useExtensions({
    id,
    object,
    compact,
    viewMode,
    viewState,
    editorStateStore,
    setWidgets,
    settings,
    identity,
    onSelectObject,
  });

  const extensions = useMemo(
    () => [coreExtensions, extensionsProp].filter(isNonNullable).flat(),
    [coreExtensions, extensionsProp],
  );

  const editorRootProps = useMemo<MarkdownEditorEditorRootProps>(
    () => ({
      extensions,
      viewMode,
      getMenu: menuOptions.getMenu,
      trigger: menuOptions.trigger,
      placeholder: menuOptions.placeholder,
      ...(menuOptions.filter !== undefined ? { filter: menuOptions.filter } : {}),
      ...(menuOptions.triggerKey !== undefined ? { triggerKey: menuOptions.triggerKey } : {}),
    }),
    [extensions, viewMode, menuOptions],
  );

  const markdownContextValue = useMemo<MarkdownEditorContextValue>(
    () => ({
      id,
      attendableId,
      compact,
      viewMode,
      widgets,
      onAction,
      onFileUpload,
      onViewModeChange,
    }),
    [id, attendableId, compact, viewMode, widgets, onAction, onFileUpload, onViewModeChange],
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

type MarkdownEditorContentProps = Omit<NaturalMarkdownEditorContentProps, 'id' | 'extensions' | 'toolbarState'>;

const MarkdownEditorContent = composable<HTMLDivElement, MarkdownEditorContentProps>(
  ({ compact: compactProp, ...props }, _forwardedRef) => {
    const {
      id,
      attendableId,
      compact = compactProp,
      viewMode,
      onFileUpload,
    } = useMarkdownEditorContext(MARKDOWN_EDITOR_CONTENT_NAME);
    const { extensions, setController, state } = useEditorContext(MARKDOWN_EDITOR_CONTENT_NAME);

    const handleRef = useCallback(
      (view: EditorView | null) => {
        setController(createEditorController(view));
      },
      [setController],
    );

    return (
      <NaturalMarkdownEditorContent
        {...composableProps(props)}
        id={id}
        attendableId={attendableId}
        compact={compact}
        viewMode={viewMode}
        toolbarState={state as Atom.Writable<EditorToolbarState>}
        extensions={extensions}
        onFileUpload={onFileUpload}
        ref={handleRef}
      />
    );
  },
);

MarkdownEditorContent.displayName = MARKDOWN_EDITOR_CONTENT_NAME;

//
// MarkdownEditor.Toolbar
//

const MARKDOWN_EDITOR_TOOLBAR_NAME = 'MarkdownEditor.Toolbar';

type MarkdownEditorToolbarProps = ThemedClassName<
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
// MarkdownEditor.Blocks (embedded objects)
//

const MARKDOWN_EDITOR_BLOCKS_NAME = 'MarkdownEditor.Blocks';

type MarkdownEditorBlocksProps = {};

const MarkdownEditorBlocks = (_props: MarkdownEditorBlocksProps) => {
  const { widgets } = useMarkdownEditorContext(MARKDOWN_EDITOR_BLOCKS_NAME);

  return (
    <>
      {widgets.map(({ id, root, Component, props }) => (
        <div key={id}>{createPortal(<Component {...props} />, root)}</div>
      ))}
    </>
  );
};

MarkdownEditorBlocks.displayName = MARKDOWN_EDITOR_BLOCKS_NAME;

//
// MarkdownEditor
//

/** @private */
export const MarkdownEditor = {
  Content: MarkdownEditorContent,
  Toolbar: MarkdownEditorToolbar,
  Blocks: MarkdownEditorBlocks,
};

export type { MarkdownEditorBlocksProps, MarkdownEditorContentProps, MarkdownEditorToolbarProps };

/** @deprecated Use `MarkdownEditorProviderProps`. */
export type MarkdownEditorRootProps = MarkdownEditorProviderProps;
