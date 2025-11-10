//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { Atom } from '@effect-atom/atom-react';
import React, { useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useAppGraph, useCapabilities } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import { type SelectionManager } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';
import { Text } from '@dxos/schema';

import { MarkdownCapabilities } from '../capabilities';
import { type DocumentType, useLinkQuery } from '../hooks';
import { Markdown, type MarkdownPluginState } from '../types';

import { MarkdownEditor, type MarkdownEditorContentProps, type MarkdownEditorRootProps } from './MarkdownEditor';

export type MarkdownContainerProps = {
  role?: string;
  object: DocumentType;
  settings: Markdown.Settings;
  selectionManager?: SelectionManager;
} & (Pick<MarkdownEditorRootProps, 'id' | 'viewMode' | 'onViewModeChange'> &
  Pick<MarkdownEditorContentProps, 'editorStateStore'> &
  Pick<MarkdownPluginState, 'extensionProviders'>);

export const MarkdownContainer = ({
  id,
  role,
  object,
  settings,
  extensionProviders,
  ...props
}: MarkdownContainerProps) => {
  const space = getSpace(object);
  const isDocument = Obj.instanceOf(Markdown.Document, object);
  const isText = Obj.instanceOf(Text.Text, object);
  const attendableId = isDocument ? Obj.getDXN(object).toString() : undefined;

  // Extensions from other plugins.
  // TODO(burdon): Document MarkdownPluginState.extensionProviders
  const otherExtensionProviders = useCapabilities(MarkdownCapabilities.Extensions);
  const extensions = useMemo<Extension[]>(() => {
    if (!Obj.instanceOf(Markdown.Document, object)) {
      return [];
    }

    return [...(otherExtensionProviders ?? []), ...(extensionProviders ?? [])]
      .flat()
      .reduce((acc: Extension[], provider) => {
        const extension =
          typeof provider === 'function' ? provider({ document: object as Markdown.Document }) : provider;
        if (extension) {
          acc.push(extension);
        }

        return acc;
      }, []);
  }, [extensionProviders, otherExtensionProviders, object]);

  // Toolbar actions from app graph.
  const { graph } = useAppGraph();
  const customActions = useMemo(() => {
    return Atom.make((get) => {
      const actions = get(graph.actions(id));
      const nodes = actions.filter((action) => action.properties.disposition === 'toolbar');
      const edges = nodes.map((node) => ({ source: 'root', target: node.id }));
      return { nodes, edges };
    });
  }, [graph]);

  // File upload.
  const [upload] = useCapabilities(Capabilities.FileUploader);
  const handleFileUpload = useMemo(() => {
    if (!space || !upload) {
      return undefined;
    }

    return async (file: File) => upload(space, file);
  }, [space, upload]);

  // Query for @ refs.
  const handleLinkQuery = useLinkQuery(space);

  return (
    <StackItem.Content toolbar={settings.toolbar}>
      <MarkdownEditor.Root
        id={attendableId ?? id}
        object={object}
        extensions={extensions}
        onFileUpload={handleFileUpload}
        onLinkQuery={handleLinkQuery}
        {...props}
      >
        {settings.toolbar && (
          <MarkdownEditor.Toolbar id={attendableId ?? id} role={role} customActions={customActions} />
        )}
        <MarkdownEditor.Content
          initialValue={isDocument ? object.content?.target?.content : isText ? object.content : object.text}
          scrollPastEnd={role === 'article'}
        />
        <MarkdownEditor.Blocks />
      </MarkdownEditor.Root>
    </StackItem.Content>
  );
};

export default MarkdownContainer;
