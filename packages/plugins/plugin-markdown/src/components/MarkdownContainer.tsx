//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Capabilities, Surface, useAppGraph, useCapabilities } from '@dxos/app-framework';
import { DXN, Obj } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { type SelectionManager } from '@dxos/react-ui-attention';
import { type PreviewLinkRef, type PreviewOptions } from '@dxos/react-ui-editor';
import { DataType } from '@dxos/schema';

import { useExtensions, useLinkQuery } from '../hooks';
import { Markdown } from '../types';
import { getFallbackName } from '../util';

import { MarkdownEditor, type MarkdownEditorProps } from './MarkdownEditor';

export type MarkdownContainerProps = {
  object: Markdown.Document | DataType.Text | any;
  settings: Markdown.Settings;
  selectionManager?: SelectionManager;
} & Pick<
  MarkdownEditorProps,
  'id' | 'role' | 'extensionProviders' | 'viewMode' | 'editorStateStore' | 'onViewModeChange'
>;

export const MarkdownContainer = ({
  id,
  role,
  object,
  settings,
  selectionManager,
  viewMode,
  editorStateStore,
  onViewModeChange,
}: MarkdownContainerProps) => {
  const scrollPastEnd = role === 'article';
  const document = Obj.instanceOf(Markdown.Document, object) ? object : undefined;
  const text = Obj.instanceOf(DataType.Text, object) ? object : undefined;

  // Preview blocks.
  const [previewBlocks, setPreviewBlocks] = useState<{ link: PreviewLinkRef; el: HTMLElement }[]>([]);
  const previewOptions = useMemo(
    (): PreviewOptions => ({
      addBlockContainer: (link, el) => {
        setPreviewBlocks((prev) => [...prev, { link, el }]);
      },
      removeBlockContainer: (link) => {
        setPreviewBlocks((prev) => prev.filter(({ link: prevLink }) => prevLink.ref !== link.ref));
      },
    }),
    [],
  );

  // TODO(burdon): Clean-up extensions.
  const extensions = useExtensions({
    id,
    document,
    text,
    settings,
    selectionManager,
    viewMode,
    editorStateStore,
    previewOptions,
  });

  const handleLinkQuery = useLinkQuery(object);

  // TODO(burdon): Reconcile variants.
  const editor = document ? (
    <DocumentEditor
      id={fullyQualifiedId(document)}
      role={role}
      document={document}
      extensions={extensions}
      viewMode={viewMode}
      settings={settings}
      scrollPastEnd={scrollPastEnd}
      onViewModeChange={onViewModeChange}
      onLinkQuery={handleLinkQuery}
    />
  ) : text ? (
    <MarkdownEditor
      id={id}
      role={role}
      initialValue={text.content}
      extensions={extensions}
      viewMode={viewMode}
      toolbar={settings.toolbar}
      inputMode={settings.editorInputMode}
      scrollPastEnd={scrollPastEnd}
      onViewModeChange={onViewModeChange}
      onLinkQuery={handleLinkQuery}
    />
  ) : (
    <MarkdownEditor
      id={id}
      role={role}
      initialValue={object.text}
      extensions={extensions}
      viewMode={viewMode}
      toolbar={settings.toolbar}
      inputMode={settings.editorInputMode}
      scrollPastEnd={scrollPastEnd}
      onViewModeChange={onViewModeChange}
      onLinkQuery={handleLinkQuery}
    />
  );

  return (
    <>
      {editor}
      {previewBlocks.map(({ link, el }) => (
        <PreviewBlock key={link.ref} link={link} el={el} />
      ))}
    </>
  );
};

type DocumentEditorProps = {
  document: Markdown.Document;
} & Omit<MarkdownContainerProps, 'object' | 'extensionProviders' | 'editorStateStore'> &
  Pick<MarkdownEditorProps, 'id' | 'scrollPastEnd' | 'extensions' | 'onLinkQuery'>;

// TODO(burdon): Consolidate with above.
export const DocumentEditor = ({ id, document, settings, viewMode, ...props }: DocumentEditorProps) => {
  const space = getSpace(document);

  // Migrate gradually to `fallbackName`.
  useEffect(() => {
    if (typeof document.fallbackName === 'string') {
      return;
    }

    const fallbackName = document.content?.target?.content
      ? getFallbackName(document.content.target.content)
      : undefined;
    if (fallbackName) {
      document.fallbackName = fallbackName;
    }
  }, [document, document.content]);

  // File dragging.
  const [upload] = useCapabilities(Capabilities.FileUploader);
  const handleFileUpload = useMemo(() => {
    if (!space || !upload) {
      return undefined;
    }

    return async (file: File) => upload(space, file);
  }, [space, upload]);

  // Toolbar actions.
  const { graph } = useAppGraph();
  const customActions = useMemo(() => {
    return Rx.make((get) => {
      const actions = get(graph.actions(id));
      const nodes = actions.filter((action) => action.properties.disposition === 'toolbar');
      const edges = nodes.map((node) => ({ source: 'root', target: node.id }));
      return { nodes, edges };
    });
  }, [graph]);

  return (
    <MarkdownEditor
      id={id}
      initialValue={document.content?.target?.content}
      viewMode={viewMode}
      toolbar={settings.toolbar}
      customActions={customActions}
      inputMode={settings.editorInputMode}
      onFileUpload={handleFileUpload}
      {...props}
    />
  );
};

/**
 * Embedded object.
 */
const PreviewBlock = ({ link, el }: { link: PreviewLinkRef; el: HTMLElement }) => {
  const client = useClient();
  const dxn = DXN.parse(link.ref);
  const subject = client.graph.ref(dxn).target;
  const data = useMemo(() => ({ subject }), [subject]);

  return createPortal(<Surface role='card--transclusion' data={data} limit={1} />, el);
};

export default MarkdownContainer;
