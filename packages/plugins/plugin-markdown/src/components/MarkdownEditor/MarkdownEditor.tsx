//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { type Atom } from '@effect-atom/atom-react';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { DXN } from '@dxos/keys';
import { useClient } from '@dxos/react-client';
import { type ThemedClassName } from '@dxos/react-ui';
import {
  EditorMenuProvider,
  type EditorToolbarState,
  type UseEditorMenu,
  useEditorMenu,
  useEditorToolbar,
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
  setEditorView: (view: EditorView) => void;
  extensions: Extension[];
  previewBlocks: PreviewBlock[];
  toolbarState: Atom.Writable<EditorToolbarState>;
  popoverMenu: Omit<UseEditorMenu, 'extension'>;
} & (Pick<ExtensionsOptions, 'compact' | 'viewMode'> &
  Pick<NaturalMarkdownToolbarProps, 'editorView' | 'onAction' | 'onFileUpload' | 'onViewModeChange'>);

const [MarkdownEditorContextProvider, useMarkdownEditorContext] =
  createContext<MarkdownEditorContextValue>('MarkdownEditor.Context');

//
// MarkdownEditor.Root
//

type MarkdownEditorRootProps = PropsWithChildren<
  {
    object?: DocumentType;
    extensions?: Extension[];
  } & Pick<
    MarkdownEditorContextValue,
    'id' | 'attendableId' | 'viewMode' | 'compact' | 'onAction' | 'onFileUpload' | 'onViewModeChange'
  > &
    Pick<UseEditorMenuOptionsProps, 'slashCommandGroups' | 'onLinkQuery'> &
    Pick<ExtensionsOptions, 'editorStateStore' | 'selectionManager' | 'settings' | 'onSelectObject'>
>;

const MarkdownEditorRoot = ({
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
  ...props
}: MarkdownEditorRootProps) => {
  const [editorView, setEditorView] = useState<EditorView>();

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

  // Toolbar state.
  const toolbarState = useEditorToolbar({ viewMode });

  // Context menu.
  const menuOptions = useEditorMenuOptions({ editorView, slashCommandGroups, onLinkQuery });
  const { extension: menuExtension, ...menuProps } = useEditorMenu(menuOptions);

  // Extensions.
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
    () => [coreExtensions, menuExtension, extensionsProp].filter(isNonNullable),
    [coreExtensions, menuExtension, extensionsProp],
  );

  return (
    <MarkdownEditorContextProvider
      id={id}
      attendableId={attendableId}
      compact={compact}
      editorView={editorView}
      setEditorView={setEditorView}
      extensions={extensions}
      previewBlocks={previewBlocks}
      toolbarState={toolbarState}
      popoverMenu={menuProps}
      viewMode={viewMode}
      {...props}
    >
      {children}
    </MarkdownEditorContextProvider>
  );
};

MarkdownEditorRoot.displayName = 'MarkdownEditor.Root';

//
// MarkdownEditor.Main
//

const MARKDOWN_EDITOR_CONTENT_NAME = 'MarkdownEditor.Content';

type MarkdownEditorContentProps = Omit<NaturalMarkdownEditorContentProps, 'id' | 'extensions' | 'toolbarState'>;

const MarkdownEditorContent = composable<HTMLDivElement, MarkdownEditorContentProps>(({ ...props }, _forwardedRef) => {
  const {
    id,
    attendableId,
    compact,
    editorView,
    setEditorView,
    viewMode,
    toolbarState,
    extensions,
    popoverMenu: { groupsRef, ...menuProps },
  } = useMarkdownEditorContext(MARKDOWN_EDITOR_CONTENT_NAME);

  return (
    <EditorMenuProvider view={editorView} groups={groupsRef.current} {...menuProps}>
      <NaturalMarkdownEditorContent
        {...composableProps(props)}
        id={id}
        attendableId={attendableId}
        compact={compact}
        viewMode={viewMode}
        toolbarState={toolbarState}
        extensions={extensions}
        ref={setEditorView}
      />
    </EditorMenuProvider>
  );
});

MarkdownEditorContent.displayName = MARKDOWN_EDITOR_CONTENT_NAME;

//
// MarkdownEditor.Toolbar
//

const MARKDOWN_EDITOR_TOOLBAR_NAME = 'MarkdownEditor.Toolbar';

type MarkdownEditorToolbarProps = ThemedClassName<
  Omit<NaturalMarkdownToolbarProps, 'state' | 'editorView' | 'onAction' | 'onFileUpload' | 'onViewModeChange' | 'id'>
>;

const MarkdownEditorToolbar = (props: MarkdownEditorToolbarProps) => {
  const { id, attendableId, editorView, toolbarState, onAction, onFileUpload, onViewModeChange } =
    useMarkdownEditorContext(MARKDOWN_EDITOR_TOOLBAR_NAME);

  return (
    <NaturalMarkdownToolbar
      {...props}
      id={attendableId ?? id}
      editorView={editorView}
      state={toolbarState}
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

  return createPortal(<Surface.Surface role='card--content' data={data} limit={1} />, el);
};

//
// MarkdownEditor
//

export const MarkdownEditor = {
  Root: MarkdownEditorRoot,
  Content: MarkdownEditorContent,
  Toolbar: MarkdownEditorToolbar,
  Blocks: MarkdownEditorBlocks,
};

export type {
  MarkdownEditorRootProps,
  MarkdownEditorContentProps,
  MarkdownEditorToolbarProps,
  MarkdownEditorBlocksProps,
};
