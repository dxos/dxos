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

import {
  MarkdownEditor,
  type MarkdownEditorMainProps,
  type MarkdownEditorRootProps,
  type MarkdownEditorToolbarProps,
} from './MarkdownEditor';

export type MarkdownContainerProps = {
  role?: string;
  object: DocumentType;
  settings: Markdown.Settings;
  selectionManager?: SelectionManager;
} & (Pick<MarkdownEditorRootProps, 'id' | 'viewMode'> &
  Pick<MarkdownPluginState, 'extensionProviders'> &
  Pick<MarkdownEditorMainProps, 'editorStateStore'> &
  Pick<MarkdownEditorToolbarProps, 'onViewModeChange'> &
  Pick<MarkdownPluginState, 'extensionProviders'>);

// TODO(burdon): Test comments.
// TODO(burdon): Test toolbar state.
// TODO(burdon): Test input mode.
// TODO(burdon): Test update document name.
// TODO(burdon): Test file upload.

// TODO(burdon): Move other space-dependent extensions here (e.g., Popover).
export const MarkdownContainer = ({
  id,
  role,
  object,
  settings,
  extensionProviders,
  onViewModeChange,
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

  // File upload.
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
    <StackItem.Content toolbar={settings.toolbar}>
      <MarkdownEditor.Root id={attendableId ?? id} extensions={extensions} onLinkQuery={handleLinkQuery} {...props}>
        {settings.toolbar && (
          <MarkdownEditor.Toolbar
            role={role}
            customActions={customActions}
            onFileUpload={handleFileUpload}
            onViewModeChange={onViewModeChange}
          />
        )}
        <MarkdownEditor.Main
          toolbar={settings.toolbar}
          initialValue={isDocument ? object.content?.target?.content : isText ? object.content : object.text}
          scrollPastEnd={role === 'article'}
        />
      </MarkdownEditor.Root>
    </StackItem.Content>
  );
};

export default MarkdownContainer;
