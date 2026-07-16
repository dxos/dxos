//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { Atom } from '@effect-atom/atom-react';
import React, { forwardRef, useCallback, useEffect, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useActionRunner } from '@dxos/plugin-graph';
import { useObject } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Panel } from '@dxos/react-ui';
import { type ViewStateManager } from '@dxos/react-ui-attention';
import { Editor, useEditorContext } from '@dxos/react-ui-editor';
import { graphActions, isToolbarAction } from '@dxos/react-ui-menu';
import { Text } from '@dxos/schema';

import {
  MarkdownEditor,
  type MarkdownEditorContentProps,
  MarkdownEditorProvider,
  type MarkdownEditorProviderProps,
} from '#components';
import { useLinkQuery } from '#hooks';
import { Markdown, MarkdownCapabilities, type MarkdownPluginState } from '#types';

export type MarkdownArticleProps = AppSurface.ObjectArticleProps<
  Markdown.Document | Text.Text,
  {
    id: string;
    settings: Markdown.Settings;
    viewState?: ViewStateManager;
  } & Pick<MarkdownPluginState, 'extensionProviders'> &
    Pick<MarkdownEditorProviderProps, 'viewMode' | 'onSelectObject' | 'onViewModeChange'> &
    Pick<MarkdownEditorContentProps, 'editorStateStore'>
>;

export const MarkdownArticle = forwardRef<HTMLDivElement, MarkdownArticleProps>(
  (
    { role, subject: object, id, attendableId, settings, extensionProviders, onSelectObject, viewMode, ...props },
    forwardedRef,
  ) => {
    const db = Obj.isObject(object) ? Obj.getDatabase(object) : undefined;
    const [docContent] = useObject(Obj.instanceOf(Markdown.Document, object) ? object.content : undefined, 'content');
    const [textContent] = useObject(Obj.instanceOf(Text.Text, object) ? object : undefined, 'content');
    const initialValue = docContent ?? textContent;

    // Extensions from other plugins.
    const otherExtensionProviders = useCapabilities(MarkdownCapabilities.ExtensionProvider);
    const extensions = useMemo<Extension[]>(() => {
      if (!Obj.instanceOf(Markdown.Document, object) && !Obj.instanceOf(Text.Text, object)) {
        return [];
      }

      const document = Obj.instanceOf(Markdown.Document, object) ? object : undefined;
      return [...(otherExtensionProviders ?? []), ...(extensionProviders ?? [])]
        .flat()
        .reduce((acc: Extension[], provider) => {
          const extension = typeof provider === 'function' ? provider({ document, viewMode }) : provider;
          if (extension) {
            acc.push(extension);
          }

          return acc;
        }, []);
    }, [extensionProviders, otherExtensionProviders, object, viewMode]);

    // Toolbar actions from app graph.
    const { graph } = useAppGraph();
    const runAction = useActionRunner();
    const customActions = useMemo(() => {
      return Atom.make((get) => graphActions(graph, get, attendableId ?? id, { filter: isToolbarAction }));
    }, [graph, attendableId, id]);

    // File upload.
    const [upload] = useCapabilities(AppCapabilities.FileUploader);
    const handleFileUpload = useMemo(() => {
      if (!db || !upload) {
        return undefined;
      }

      return async (file: File) => upload(db, file);
    }, [db, upload]);

    // Local identity for collaboration awareness.
    const identity = useIdentity();

    // Query for @ refs.
    const handleLinkQuery = useLinkQuery(db, Obj.isObject(object) ? object : undefined);

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
      <MarkdownEditorProvider
        id={id}
        attendableId={attendableId}
        object={object}
        compact={role !== AppSurface.Article.role}
        extensions={extensions}
        settings={settings}
        viewMode={viewMode}
        identity={identity}
        onAction={runAction}
        onFileUpload={handleFileUpload}
        onLinkQuery={handleLinkQuery}
        onSelectObject={handleSelectObject}
        {...props}
      >
        {(editorRootProps) => (
          <Editor.Root {...editorRootProps}>
            <RegisterEditorView id={id} attendableId={attendableId} />
            <Panel.Root role={role} ref={forwardedRef}>
              {settings.toolbar && (
                <Panel.Toolbar>
                  <MarkdownEditor.Toolbar classNames='dx-document' customActions={customActions} />
                </Panel.Toolbar>
              )}
              <Panel.Content>
                <MarkdownEditor.Content initialValue={initialValue} />
                <Editor.Blocks />
              </Panel.Content>
            </Panel.Root>
          </Editor.Root>
        )}
      </MarkdownEditorProvider>
    );
  },
);

MarkdownArticle.displayName = 'MarkdownArticle';

/**
 * Registers the mounted editor view in the shared `EditorViews` registry so operations (e.g.
 * `ScrollToAnchor` from comments/navigation) can target it by id. Must render inside `Editor.Root`.
 */
const RegisterEditorView = ({ id, attendableId }: { id: string; attendableId?: string }) => {
  const { controller } = useEditorContext('MarkdownArticle.RegisterEditorView');
  const [editorViews] = useCapabilities(MarkdownCapabilities.EditorViews);
  const view = controller?.view;
  useEffect(() => {
    if (view && editorViews) {
      editorViews.register(attendableId ?? id, view, id);
      return () => editorViews.unregister(attendableId ?? id);
    }
  }, [view, editorViews, attendableId, id]);

  return null;
};
