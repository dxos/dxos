//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Surface } from '@dxos/app-framework/react';
import { DXN } from '@dxos/keys';
import { type Live } from '@dxos/live-object';
import { useClient } from '@dxos/react-client';
import {
  EditorMenuProvider,
  type EditorToolbarState,
  type PreviewBlock,
  type PreviewOptions,
  type UseEditorMenu,
  useEditorMenu,
  useEditorToolbar,
} from '@dxos/react-ui-editor';
import { isNonNullable } from '@dxos/util';

import {
  type DocumentType,
  type ExtensionsOptions,
  type UseEditorMenuOptionsProps,
  useEditorMenuOptions,
  useExtensions,
} from '../../hooks';

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
  setEditorView: (view: EditorView) => void;
  extensions: Extension[];
  previewBlocks: PreviewBlock[];
  toolbarState: Live<EditorToolbarState>;
  popoverMenu: Omit<UseEditorMenu, 'extension'>;
} & (Pick<ExtensionsOptions, 'viewMode'> &
  Pick<NaturalMarkdownToolbarProps, 'editorView' | 'onFileUpload' | 'onViewModeChange'>);

const [MarkdownEditorContextProvider, useMarkdownEditorContext] =
  createContext<MarkdownEditorContextValue>('MarkdownEditor.Context');

//
// MarkdownEditor.Root
//

type MarkdownEditorRootProps = PropsWithChildren<
  {
    object?: DocumentType;
    extensions?: Extension[];
  } & Pick<MarkdownEditorContextValue, 'id' | 'onFileUpload' | 'onViewModeChange' | 'viewMode'> &
    Pick<UseEditorMenuOptionsProps, 'slashCommandGroups' | 'onLinkQuery'> &
    Pick<ExtensionsOptions, 'editorStateStore' | 'selectionManager' | 'settings'>
>;

const MarkdownEditorRoot = ({
  children,
  id,
  object,
  editorStateStore,
  selectionManager,
  settings,
  viewMode,
  extensions: extensionsParam,
  slashCommandGroups,
  onLinkQuery,
  ...props
}: MarkdownEditorRootProps) => {
  const [editorView, setEditorView] = useState<EditorView>();

  // Preview blocks.
  const [previewBlocks, setPreviewBlocks] = useState<PreviewBlock[]>([]);
  const previewOptions = useMemo<PreviewOptions>(
    () => ({
      addBlockContainer: (block) => {
        setPreviewBlocks((prev) => [...prev, block]);
      },
      removeBlockContainer: ({ link }) => {
        setPreviewBlocks((prev) => prev.filter(({ link: prevLink }) => prevLink.ref !== link.ref));
      },
    }),
    [],
  );

  // Toolbar state.
  const toolbarState = useEditorToolbar({ viewMode });

  // Context menu.
  const menuOptions = useEditorMenuOptions({
    editorView,
    slashCommandGroups,
    onLinkQuery,
  });
  const { extension: menuExtension, ...menuProps } = useEditorMenu(menuOptions);

  // Extensions.
  const coreExtensions = useExtensions({
    id,
    object,
    editorStateStore,
    previewOptions,
    selectionManager,
    settings,
    viewMode,
  });

  const extensions = useMemo(
    () => [coreExtensions, menuExtension, extensionsParam].filter(isNonNullable),
    [coreExtensions, menuExtension, extensionsParam],
  );

  return (
    <MarkdownEditorContextProvider
      id={id}
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

type MarkdownEditorContentProps = Omit<NaturalMarkdownEditorContentProps, 'id' | 'extensions' | 'toolbarState'>;

const MarkdownEditorContent = (props: MarkdownEditorContentProps) => {
  const {
    id,
    editorView,
    setEditorView,
    viewMode,
    toolbarState,
    extensions,
    popoverMenu: { groupsRef, ...menuProps },
  } = useMarkdownEditorContext(MarkdownEditorContent.displayName);

  return (
    <EditorMenuProvider view={editorView} groups={groupsRef.current} {...menuProps}>
      <NaturalMarkdownEditorContent
        {...props}
        id={id}
        viewMode={viewMode}
        toolbarState={toolbarState}
        extensions={extensions}
        ref={setEditorView}
      />
    </EditorMenuProvider>
  );
};

MarkdownEditorContent.displayName = 'MarkdownEditor.Content';

//
// MarkdownEditor.Toolbar
//

type MarkdownEditorToolbarProps = Omit<
  NaturalMarkdownToolbarProps,
  'state' | 'editorView' | 'onFileUpload' | 'onViewModeChange'
>;

const MarkdownEditorToolbar = (props: MarkdownEditorToolbarProps) => {
  const { toolbarState, ...rootProps } = useMarkdownEditorContext(MarkdownEditorToolbar.displayName);

  return <NaturalMarkdownToolbar {...props} {...rootProps} state={toolbarState} />;
};

MarkdownEditorToolbar.displayName = 'MarkdownEditor.Toolbar';

//
// MarkdownEditor.Blocks (embedded objects)
//

type MarkdownEditorBlocksProps = {};

const MarkdownEditorBlocks = (_props: MarkdownEditorBlocksProps) => {
  const { previewBlocks } = useMarkdownEditorContext(MarkdownEditorBlocks.displayName);

  return (
    <>
      {previewBlocks.map(({ link, el }) => (
        <PreviewBlock key={link.ref} link={link} el={el} />
      ))}
    </>
  );
};

MarkdownEditorBlocks.displayName = 'MarkdownEditor.Blocks';

const PreviewBlock = ({ el, link }: PreviewBlock) => {
  const client = useClient();
  const dxn = DXN.parse(link.ref);
  const subject = client.graph.makeRef(dxn).target;
  const data = useMemo(() => ({ subject }), [subject]);

  return createPortal(<Surface role='card--transclusion' data={data} limit={1} />, el);
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
