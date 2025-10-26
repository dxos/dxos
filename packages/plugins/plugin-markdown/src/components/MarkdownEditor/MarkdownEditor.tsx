//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Surface } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { type Live } from '@dxos/live-object';
import { useClient } from '@dxos/react-client';
import {
  type EditorToolbarState,
  PopoverMenuProvider,
  type PreviewBlock,
  type PreviewOptions,
  type UsePopoverMenu,
  useEditorToolbarState,
  usePopoverMenu,
} from '@dxos/react-ui-editor';
import { isNonNullable } from '@dxos/util';

import {
  type DocumentType,
  type ExtensionsOptions,
  type UsePopoverMenuOptionsProps,
  useExtensions,
  usePopoverMenuOptions,
} from '../../hooks';

import {
  MarkdownEditorMain as NaturalMarkdownEditorMain,
  type MarkdownEditorMainProps as NaturalMarkdownEditorMainProps,
} from './MarkdownEditorMain';
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
  popoverMenu: Omit<UsePopoverMenu, 'extension'>;
} & (Pick<ExtensionsOptions, 'viewMode'> &
  Pick<NaturalMarkdownToolbarProps, 'editorView' | 'onFileUpload' | 'onViewModeChange'>);

const [MarkdownEditorContextProvider, useMarkdownEditorContext] =
  createContext<MarkdownEditorContextValue>('MarkdownEditor.Context');

//
// Root
//

type MarkdownEditorRootProps = PropsWithChildren<
  {
    object?: DocumentType;
  } & Pick<MarkdownEditorContextValue, 'id' | 'extensions' | 'onFileUpload' | 'onViewModeChange' | 'viewMode'> &
    Pick<UsePopoverMenuOptionsProps, 'slashCommandGroups' | 'onLinkQuery'> &
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
  const toolbarState = useEditorToolbarState({ viewMode });

  // Context menu.
  const menuOptions = usePopoverMenuOptions({ editorView, slashCommandGroups, onLinkQuery });
  const { extension: menuExtension, ...menuProps } = usePopoverMenu(menuOptions);

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
// Main
//

type MarkdownEditorMainProps = Omit<NaturalMarkdownEditorMainProps, 'id' | 'extensions' | 'toolbarState'>;

const MarkdownEditorMain = (props: MarkdownEditorMainProps) => {
  const {
    id,
    extensions,
    editorView,
    setEditorView,
    toolbarState,
    popoverMenu: { groupsRef, ...menuProps },
  } = useMarkdownEditorContext(MarkdownEditorMain.displayName);

  return (
    <PopoverMenuProvider view={editorView} groups={groupsRef.current} {...menuProps}>
      <NaturalMarkdownEditorMain
        {...props}
        id={id}
        extensions={extensions}
        toolbarState={toolbarState}
        ref={setEditorView}
      />
    </PopoverMenuProvider>
  );
};

MarkdownEditorMain.displayName = 'MarkdownEditor.Main';

//
// Toolbar
//

type MarkdownEditorToolbarProps = Omit<
  NaturalMarkdownToolbarProps,
  'id' | 'state' | 'editorView' | 'onFileUpload' | 'onViewModeChange'
>;

const MarkdownEditorToolbar = (props: MarkdownEditorToolbarProps) => {
  const { toolbarState, ...rootProps } = useMarkdownEditorContext(MarkdownEditorToolbar.displayName);

  return <NaturalMarkdownToolbar {...props} {...rootProps} state={toolbarState} />;
};

MarkdownEditorToolbar.displayName = 'MarkdownEditor.Toolbar';

//
// Preview
//

type MarkdownEditorPreviewProps = {};

const MarkdownEditorPreview = (_props: MarkdownEditorPreviewProps) => {
  const { previewBlocks } = useMarkdownEditorContext(MarkdownEditorPreview.displayName);

  return (
    <>
      {previewBlocks.map(({ link, el }) => (
        <PreviewBlock key={link.ref} link={link} el={el} />
      ))}
    </>
  );
};

MarkdownEditorPreview.displayName = 'MarkdownEditor.Preview';

/**
 * Embedded object.
 */
const PreviewBlock = ({ el, link }: PreviewBlock) => {
  const client = useClient();
  const dxn = DXN.parse(link.ref);
  const subject = client.graph.ref(dxn).target;
  const data = useMemo(() => ({ subject }), [subject]);

  return createPortal(<Surface role='card--transclusion' data={data} limit={1} />, el);
};

//
// MarkdownEditor
//

export const MarkdownEditor = {
  Root: MarkdownEditorRoot,
  Main: MarkdownEditorMain,
  Toolbar: MarkdownEditorToolbar,
  Preview: MarkdownEditorPreview,
};

export type {
  MarkdownEditorRootProps,
  MarkdownEditorMainProps,
  MarkdownEditorToolbarProps,
  MarkdownEditorPreviewProps,
};
