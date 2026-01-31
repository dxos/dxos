//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { Atom } from '@effect-atom/atom-react';
import React, { forwardRef, useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { type SurfaceComponentProps, useAppGraph, useCapabilities } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { useActionRunner } from '@dxos/plugin-graph';
import { useObject } from '@dxos/react-client/echo';
import { type SelectionManager } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';
import { Text } from '@dxos/schema';

import { useLinkQuery } from '../hooks';
import { Markdown, MarkdownCapabilities, type MarkdownPluginState } from '../types';

import { MarkdownEditor, type MarkdownEditorContentProps, type MarkdownEditorRootProps } from './MarkdownEditor';

export type MarkdownContainerProps = SurfaceComponentProps<
  Markdown.Document | Text.Text,
  {
    id: string;
    settings: Markdown.Settings;
    selectionManager?: SelectionManager;
  } & Pick<MarkdownEditorRootProps, 'viewMode' | 'onViewModeChange'> &
    Pick<MarkdownEditorContentProps, 'editorStateStore'> &
    Pick<MarkdownPluginState, 'extensionProviders'>
>;

export const MarkdownContainer = forwardRef<HTMLDivElement, MarkdownContainerProps>(
  ({ role, subject: object, id, settings, extensionProviders, ...props }, forwardedRef) => {
    const db = Obj.isObject(object) ? Obj.getDatabase(object) : undefined;
    const attendableId = Obj.instanceOf(Markdown.Document, object) ? Obj.getDXN(object).toString() : undefined;
    const [docContent] = useObject(Obj.instanceOf(Markdown.Document, object) ? object.content : undefined, 'content');
    const [textContent] = useObject(Obj.instanceOf(Text.Text, object) ? object : undefined, 'content');
    const initialValue = docContent ?? textContent;

    // Extensions from other plugins.
    // TODO(burdon): Document MarkdownPluginState.extensionProviders
    const otherExtensionProviders = useCapabilities(MarkdownCapabilities.Extensions);
    const extensions = useMemo<Extension[]>(() => {
      if (!Obj.instanceOf(Markdown.Document, object) && !Obj.instanceOf(Text.Text, object)) {
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
    const runAction = useActionRunner();
    const customActions = useMemo(() => {
      return Atom.make((get) => {
        const actions = get(graph.actions(id));
        const nodes = actions.filter((action) => action.properties.disposition === 'toolbar');
        const edges = nodes.map((node) => ({ source: 'root', target: node.id }));
        return { nodes, edges };
      });
    }, [graph]);

    // File upload.
    const [upload] = useCapabilities(Common.Capability.FileUploader);
    const handleFileUpload = useMemo(() => {
      if (!db || !upload) {
        return undefined;
      }

      return async (file: File) => upload(db, file);
    }, [db, upload]);

    // Query for @ refs.
    const handleLinkQuery = useLinkQuery(db);

    return (
      <StackItem.Content toolbar={settings.toolbar} ref={forwardedRef}>
        <MarkdownEditor.Root
          id={attendableId ?? id}
          object={object}
          extensions={extensions}
          settings={settings}
          onAction={runAction}
          onFileUpload={handleFileUpload}
          onLinkQuery={handleLinkQuery}
          {...props}
        >
          {settings.toolbar && (
            <MarkdownEditor.Toolbar id={attendableId ?? id} role={role} customActions={customActions} />
          )}
          <MarkdownEditor.Content initialValue={initialValue} scrollPastEnd={role === 'article'} />
          <MarkdownEditor.Blocks />
        </MarkdownEditor.Root>
      </StackItem.Content>
    );
  },
);

export default MarkdownContainer;
