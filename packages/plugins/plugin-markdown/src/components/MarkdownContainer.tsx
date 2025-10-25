//
// Copyright 2024 DXOS.org
//

import { Rx } from '@effect-rx/rx-react';
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { Capabilities, Surface, useAppGraph, useCapabilities } from '@dxos/app-framework';
import { DXN, Obj } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { getSpace } from '@dxos/react-client/echo';
import { fullyQualifiedId } from '@dxos/react-client/echo';
import { type SelectionManager } from '@dxos/react-ui-attention';
import { type PreviewLinkRef, type PreviewOptions } from '@dxos/react-ui-editor';
import { DataType } from '@dxos/schema';

import { type DocumentType, useExtensions, useLinkQuery } from '../hooks';
import { Markdown } from '../types';

import { MarkdownEditor, type MarkdownEditorProps } from './MarkdownEditor';

export type MarkdownContainerProps = {
  object: DocumentType;
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
  ...props
}: MarkdownContainerProps) => {
  const space = getSpace(object);
  const isDocument = Obj.instanceOf(Markdown.Document, object);
  const isText = Obj.instanceOf(DataType.Text, object);

  // TODO(burdon): See useExtensions.
  // Migrate gradually to `fallbackName`.
  // useEffect(() => {
  //   if (!isDocument || typeof object.fallbackName === 'string') {
  //     return;
  //   }
  //   const fallbackName = object.content?.target?.content ? getFallbackName(object.content.target.content) : undefined;
  //   if (fallbackName) {
  //     object.fallbackName = fallbackName;
  //   }
  // }, [object, isDocument && object.content, isDocument]);

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

  // Create extensions.
  const extensions = useExtensions({
    id,
    object,
    settings,
    selectionManager,
    viewMode,
    editorStateStore,
    previewOptions,
  });

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

  // Query for @ refs.
  const handleLinkQuery = useLinkQuery(space);

  return (
    <>
      <MarkdownEditor
        id={isDocument ? fullyQualifiedId(object) : id}
        role={role}
        initialValue={isDocument ? object.content?.target?.content : isText ? object.content : object.text}
        extensions={extensions}
        viewMode={viewMode}
        toolbar={settings.toolbar}
        inputMode={settings.editorInputMode}
        scrollPastEnd={role === 'article'}
        customActions={customActions}
        onLinkQuery={handleLinkQuery}
        onFileUpload={handleFileUpload}
        {...props}
      />

      {previewBlocks.map(({ link, el }) => (
        <PreviewBlock key={link.ref} link={link} el={el} />
      ))}
    </>
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
