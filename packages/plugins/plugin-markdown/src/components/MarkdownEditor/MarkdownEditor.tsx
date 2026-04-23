//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { type Atom } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type ReactNode, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { useClient } from '@dxos/react-client';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  type EditorRootProps,
  type EditorToolbarState,
  createEditorController,
  useEditorContext,
} from '@dxos/react-ui-editor';
import { type PreviewBlock, type PreviewOptions } from '@dxos/ui-editor';
import { composable, composableProps } from '@dxos/ui-theme';
import { isNonNullable } from '@dxos/util';

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

type MarkdownEditorContextValue = {
  id: string;
  attendableId?: string;
  previewBlocks: PreviewBlock[];
} & Pick<ExtensionsOptions, 'compact' | 'viewMode'> &
  Pick<NaturalMarkdownToolbarProps, 'onAction' | 'onFileUpload' | 'onViewModeChange'>;

const [MarkdownEditorContextProvider, useMarkdownEditorContext] =
  createContext<MarkdownEditorContextValue>('MarkdownEditor.Context');

/**
 * Props to spread onto `Editor.Root` from `MarkdownEditorProvider`'s render callback.
 */
export type MarkdownEditorEditorRootProps = Omit<EditorRootProps, 'children'>;

//
// MarkdownEditorProvider
//

export type MarkdownEditorProviderProps = {
  object?: DocumentType;
  extensions?: Extension[];
  children: (editorRootProps: MarkdownEditorEditorRootProps) => ReactNode;
} & Pick<
  MarkdownEditorContextValue,
  'id' | 'attendableId' | 'viewMode' | 'compact' | 'onAction' | 'onFileUpload' | 'onViewModeChange'
> &
  Pick<UseEditorMenuOptionsProps, 'slashCommandGroups' | 'onLinkQuery'> &
  Pick<ExtensionsOptions, 'editorStateStore' | 'selectionManager' | 'settings' | 'onSelectObject'>;

export const MarkdownEditorProvider = ({
  children,
  id,
  attendableId,
  object,
  settings,
  compact,
  viewMode,
  selectionManager,
  editorStateStore,
  extensions: extensionsProp,
  slashCommandGroups,
  onLinkQuery,
  onSelectObject,
  onAction,
  onFileUpload,
  onViewModeChange,
}: MarkdownEditorProviderProps) => {
  // Preview blocks.
  const [previewBlocks, setPreviewBlocks] = useState<PreviewBlock[]>([]);
  const previewOptions = useMemo<PreviewOptions>(
    () => ({
      db: Obj.isObject(object) ? Obj.getDatabase(object) : undefined,
      addBlockContainer: (block) => {
        setPreviewBlocks((prev) => [...prev, block]);
      },
      removeBlockContainer: ({ link }) => {
        setPreviewBlocks((prev) => prev.filter(({ link: prevLink }) => prevLink.dxn !== link.dxn));
      },
    }),
    [object],
  );

  // Context menu options (Editor.Root calls useEditorMenu with these props).
  const menuOptions = useEditorMenuOptions({ slashCommandGroups, onLinkQuery });

  // Core markdown extensions (popover/menu extension is added by Editor.Root).
  const coreExtensions = useExtensions({
    id,
    object,
    compact,
    viewMode,
    selectionManager,
    editorStateStore,
    previewOptions,
    settings,
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
      previewBlocks,
      onAction,
      onFileUpload,
      onViewModeChange,
    }),
    [id, attendableId, compact, viewMode, previewBlocks, onAction, onFileUpload, onViewModeChange],
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

const MarkdownEditorContent = composable<HTMLDivElement, MarkdownEditorContentProps>(({ ...props }, _forwardedRef) => {
  const { id, attendableId, compact, viewMode, onFileUpload } = useMarkdownEditorContext(MARKDOWN_EDITOR_CONTENT_NAME);

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
});

MarkdownEditorContent.displayName = MARKDOWN_EDITOR_CONTENT_NAME;

//
// MarkdownEditor.Toolbar
//

const MARKDOWN_EDITOR_TOOLBAR_NAME = 'MarkdownEditor.Toolbar';

type MarkdownEditorToolbarProps = ThemedClassName<
  Omit<NaturalMarkdownToolbarProps, 'editorView' | 'onAction' | 'onFileUpload' | 'onViewModeChange' | 'id'>
>;

const MarkdownEditorToolbar = (props: MarkdownEditorToolbarProps) => {
  const { id, attendableId, onAction, onFileUpload, onViewModeChange } =
    useMarkdownEditorContext(MARKDOWN_EDITOR_TOOLBAR_NAME);

  const { controller } = useEditorContext(MARKDOWN_EDITOR_TOOLBAR_NAME);

  return (
    <NaturalMarkdownToolbar
      {...props}
      id={attendableId ?? id}
      editorView={controller?.view ?? undefined}
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
  const { previewBlocks } = useMarkdownEditorContext(MARKDOWN_EDITOR_BLOCKS_NAME);

  return (
    <>
      {previewBlocks.map(({ link, el }) => (
        <PreviewBlock key={link.dxn} link={link} el={el} />
      ))}
    </>
  );
};

MarkdownEditorBlocks.displayName = MARKDOWN_EDITOR_BLOCKS_NAME;

const PreviewBlock = ({ el, link }: PreviewBlock) => {
  const client = useClient();
  const dxn = DXN.parse(link.dxn);
  const subject = client.graph.makeRef(dxn).target;
  const data = useMemo(() => ({ subject }), [subject]);

  return createPortal(<Surface.Surface type={AppSurface.Card} data={data} limit={1} />, el);
};

//
// MarkdownEditor
//

/** @private */
export const MarkdownEditor = {
  Content: MarkdownEditorContent,
  Toolbar: MarkdownEditorToolbar,
  Blocks: MarkdownEditorBlocks,
};

export type { MarkdownEditorContentProps, MarkdownEditorToolbarProps, MarkdownEditorBlocksProps };

/** @deprecated Use `MarkdownEditorProviderProps`. */
export type MarkdownEditorRootProps = MarkdownEditorProviderProps;
