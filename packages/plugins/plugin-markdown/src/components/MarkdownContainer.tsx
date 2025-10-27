//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { Rx } from '@effect-rx/rx-react';
import React, { useMemo } from 'react';

import { Capabilities, useAppGraph, useCapabilities } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';
import { type SelectionManager } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { MarkdownCapabilities } from '../capabilities';
import { type DocumentType, useLinkQuery } from '../hooks';
import { Markdown, type MarkdownPluginState } from '../types';

import { MarkdownEditor, type MarkdownEditorMainProps, type MarkdownEditorRootProps } from './MarkdownEditor';

export type MarkdownContainerProps = {
  role?: string;
  object: DocumentType;
  settings: Markdown.Settings;
  selectionManager?: SelectionManager;
} & (Pick<MarkdownEditorRootProps, 'id' | 'viewMode' | 'onViewModeChange'> &
  Pick<MarkdownEditorMainProps, 'editorStateStore'> &
  Pick<MarkdownPluginState, 'extensionProviders'>);

// TODO(burdon): Attention doesn't update in storybook.
// TODO(burdon): Toolbar state (currently not working in labs: e.g., heading, list, table).
//  Heading state is correct (see react-ui-editor headings.ts, but the toolbar isn't updated).
// TODO(burdon): View mode (currently not working in labs).
// TODO(burdon): Test update document name.
// TODO(burdon): Test comment threads.
// TODO(burdon): Test preview blocks.
// TODO(burdon): Test file upload.

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
  const isText = Obj.instanceOf(DataType.Text, object);
  const attendableId = isDocument ? fullyQualifiedId(object) : undefined;

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
    return Rx.make((get) => {
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
        <MarkdownEditor.Main
          toolbar={settings.toolbar}
          initialValue={isDocument ? object.content?.target?.content : isText ? object.content : object.text}
          scrollPastEnd={role === 'article'}
        />
        <MarkdownEditor.Blocks />
      </MarkdownEditor.Root>
    </StackItem.Content>
  );
};

export default MarkdownContainer;
