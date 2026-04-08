//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { Atom } from '@effect-atom/atom-react';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { type ObjectSurfaceProps } from '@dxos/app-toolkit/ui';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useActionRunner } from '@dxos/plugin-graph';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { type SelectionManager } from '@dxos/react-ui-attention';
import { Text } from '@dxos/schema';

import { MarkdownEditor, type MarkdownEditorContentProps, type MarkdownEditorRootProps } from '#components';
import { useLinkQuery } from '#hooks';
import { Markdown, MarkdownCapabilities, type MarkdownPluginState } from '#types';

export type MarkdownContainerProps = ObjectSurfaceProps<
  Markdown.Document | Text.Text,
  {
    id: string;
    settings: Markdown.Settings;
    selectionManager?: SelectionManager;
  } & Pick<MarkdownPluginState, 'extensionProviders'> &
    Pick<MarkdownEditorRootProps, 'viewMode' | 'onSelectObject' | 'onViewModeChange'> &
    Pick<MarkdownEditorContentProps, 'editorStateStore'>
>;

export const MarkdownContainer = forwardRef<HTMLDivElement, MarkdownContainerProps>(
  (
    { role, subject: object, id, attendableId, settings, extensionProviders, onSelectObject, ...props },
    forwardedRef,
  ) => {
    const db = Obj.isObject(object) ? Obj.getDatabase(object) : undefined;
    const [docContent] = useObject(Obj.instanceOf(Markdown.Document, object) ? object.content : undefined, 'content');
    const [textContent] = useObject(Obj.instanceOf(Text.Text, object) ? object : undefined, 'content');
    const initialValue = docContent ?? textContent;

    // Extensions from other plugins.
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
        const actions = get(graph.actions(attendableId ?? id));
        const nodes = actions.filter((action) => action.properties.disposition === 'toolbar');
        const edges = nodes.map((node) => ({ source: 'root', target: node.id, relation: 'child' }));
        return { nodes, edges };
      });
    }, [graph]);

    // File upload.
    const [upload] = useCapabilities(AppCapabilities.FileUploader);
    const handleFileUpload = useMemo(() => {
      if (!db || !upload) {
        return undefined;
      }

      return async (file: File) => upload(db, file);
    }, [db, upload]);

    // Query for @ refs.
    const handleLinkQuery = useLinkQuery(db);

    // Open linked objects.
    const { invokePromise } = useOperationInvoker();
    const handleSelectObject = useCallback(
      (targetId: string) => {
        if (onSelectObject) {
          onSelectObject(targetId);
        } else {
          void invokePromise?.(LayoutOperation.Open, {
            subject: [targetId],
            pivotId: attendableId,
            // TODO(wittjosiah): This should probably pre-validate.
            navigation: 'immediate',
          });
        }
      },
      [onSelectObject, invokePromise, attendableId],
    );

    return (
      <MarkdownEditor.Root
        id={id}
        attendableId={attendableId}
        object={object}
        compact={role !== 'article'}
        extensions={extensions}
        settings={settings}
        onAction={runAction}
        onFileUpload={handleFileUpload}
        onLinkQuery={handleLinkQuery}
        onSelectObject={handleSelectObject}
        {...props}
      >
        <Panel.Root role={role} ref={forwardedRef}>
          {settings.toolbar && (
            <Panel.Toolbar classNames='bg-toolbar-surface'>
              <MarkdownEditor.Toolbar classNames='dx-document' customActions={customActions} />
            </Panel.Toolbar>
          )}
          <Panel.Content>
            <MarkdownEditor.Content initialValue={initialValue} />
            <MarkdownEditor.Blocks />
          </Panel.Content>
        </Panel.Root>
      </MarkdownEditor.Root>
    );
  },
);
