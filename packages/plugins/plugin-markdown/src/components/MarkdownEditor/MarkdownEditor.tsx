//
// Copyright 2025 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Surface } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { useClient } from '@dxos/react-client';
import { PopoverMenuProvider, type PreviewLinkRef, type PreviewOptions } from '@dxos/react-ui-editor';

//
// Context
//

// TODO(burdon): Factor out type.
type PreviewBlock = {
  el: HTMLElement;
  link: PreviewLinkRef;
};

type MarkdownEditorContextValue = {
  extensions: Extension[];
  previewBlocks: PreviewBlock[];
};

const [MarkdownEditorContextProvider, useMarkdownEditorContext] =
  createContext<MarkdownEditorContextValue>('MarkdownEditor.Context');

//
// Root
//

type MarkdownEditorRootProps = PropsWithChildren<{}>;

const MarkdownEditorRoot = ({ children }: MarkdownEditorRootProps) => {
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

  // TODO(burdon): Determine extensions here.
  const extensions = useMemo(() => [], []);

  return (
    <MarkdownEditorContextProvider extensions={extensions} previewBlocks={previewBlocks}>
      <PopoverMenuProvider>{children}</PopoverMenuProvider>
    </MarkdownEditorContextProvider>
  );
};

MarkdownEditorRoot.displayName = 'MarkdownEditor.Root';

//
// Main
//

type MarkdownEditorMainProps = {};

const MarkdownEditorMain = (_props: MarkdownEditorMainProps) => {
  const { extensions } = useMarkdownEditorContext(MarkdownEditorMain.displayName);
  return null;
};

MarkdownEditorMain.displayName = 'MarkdownEditor.Main';

//
// Toolbar
//

type MarkdownEditorToolbarProps = {};

const MarkdownEditorToolbar = (_props: MarkdownEditorToolbarProps) => {
  return null;
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
