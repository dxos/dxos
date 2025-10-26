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
import { useClient } from '@dxos/react-client';
import {
  PopoverMenuProvider,
  type PreviewLinkRef,
  type PreviewOptions,
  type UsePopoverMenu,
  usePopoverMenu,
} from '@dxos/react-ui-editor';

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

// TODO(burdon): Factor out type.
type PreviewBlock = {
  el: HTMLElement;
  link: PreviewLinkRef;
};

type MarkdownEditorContextValue = {
  id: string;
  editorView?: EditorView;
  setEditorView: (view: EditorView) => void;
  extensions: Extension[];
  previewBlocks: PreviewBlock[];
  popoverMenu: Omit<UsePopoverMenu, 'extension'>;
};

const [MarkdownEditorContextProvider, useMarkdownEditorContext] =
  createContext<MarkdownEditorContextValue>('MarkdownEditor.Context');

//
// Root
//

type MarkdownEditorRootProps = PropsWithChildren<
  {
    object?: DocumentType;
  } & Pick<MarkdownEditorContextValue, 'id'> &
    Partial<Pick<MarkdownEditorContextValue, 'extensions'>> &
    Pick<UsePopoverMenuOptionsProps, 'slashCommandGroups' | 'onLinkQuery'> &
    Pick<ExtensionsOptions, 'editorStateStore' | 'selectionManager' | 'settings' | 'viewMode'>
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
}: MarkdownEditorRootProps) => {
  const [editorView, setEditorView] = useState<EditorView>();

  // Preview blocks.
  const [previewBlocks, setPreviewBlocks] = useState<PreviewBlock[]>([]);
  const previewOptions = useMemo<PreviewOptions>(
    () => ({
      addBlockContainer: (link, el) => {
        setPreviewBlocks((prev) => [...prev, { link, el }]);
      },
      removeBlockContainer: (link) => {
        setPreviewBlocks((prev) => prev.filter(({ link: prevLink }) => prevLink.ref !== link.ref));
      },
    }),
    [],
  );

  // Menu.
  const menuOptions = usePopoverMenuOptions({ editorView, slashCommandGroups, onLinkQuery });
  const { extension: menuExtension, ...menuProps } = usePopoverMenu(menuOptions);

  // Extensions.
  const coreExtensions = useExtensions({
    id,
    object,
    previewOptions,
    editorStateStore,
    selectionManager,
    settings,
    viewMode,
  });

  const extensions = useMemo(
    () => [...coreExtensions, menuExtension, ...(extensionsParam ?? [])],
    [coreExtensions, menuExtension, extensionsParam],
  );

  return (
    <MarkdownEditorContextProvider
      id={id}
      editorView={editorView}
      setEditorView={setEditorView}
      extensions={extensions}
      previewBlocks={previewBlocks}
      popoverMenu={menuProps}
    >
      {children}
    </MarkdownEditorContextProvider>
  );
};

MarkdownEditorRoot.displayName = 'MarkdownEditor.Root';

//
// Main
//

type MarkdownEditorMainProps = Omit<NaturalMarkdownEditorMainProps, 'id' | 'extensions'>;

const MarkdownEditorMain = (props: MarkdownEditorMainProps) => {
  const { id, extensions, editorView, setEditorView, popoverMenu } = useMarkdownEditorContext(
    MarkdownEditorMain.displayName,
  );
  const { groupsRef, ...menuProps } = popoverMenu;

  return (
    <PopoverMenuProvider view={editorView} groups={groupsRef.current} {...menuProps}>
      <NaturalMarkdownEditorMain {...props} id={id} extensions={extensions} ref={setEditorView} />
    </PopoverMenuProvider>
  );
};

MarkdownEditorMain.displayName = 'MarkdownEditor.Main';

//
// Toolbar
//

type MarkdownEditorToolbarProps = Omit<NaturalMarkdownToolbarProps, 'id' | 'editorView'>;

const MarkdownEditorToolbar = (props: MarkdownEditorToolbarProps) => {
  const { id, editorView } = useMarkdownEditorContext(MarkdownEditorToolbar.displayName);

  return <NaturalMarkdownToolbar {...props} id={id} editorView={editorView} />;
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
