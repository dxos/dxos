//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { Atom } from '@effect-atom/atom-react';
import React, { forwardRef, useCallback, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useActionRunner } from '@dxos/plugin-graph';
import { useObject } from '@dxos/react-client/echo';
import { Panel } from '@dxos/react-ui';
import { type ViewStateManager } from '@dxos/react-ui-attention';
import { Editor } from '@dxos/react-ui-editor';
import { graphActions, isToolbarAction } from '@dxos/react-ui-menu';
import { Text } from '@dxos/schema';

import {
  MarkdownEditor,
  type MarkdownEditorContentProps,
  MarkdownEditorProvider,
  type MarkdownEditorProviderProps,
  VersionBanner,
} from '#components';
import { useLinkQuery, useVersioning } from '#hooks';
import { Markdown, MarkdownCapabilities, type MarkdownPluginState } from '#types';

import { versionDiff } from '../../extensions';
import { createBranch, mergeBranch, restore } from '../../model';
import { DiffView } from '../DiffView';

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

    // Version selection: swap the editor's subject to the active branch Text, or show a
    // read-only snapshot when viewing a checkpoint. Selection is per-user session state.
    const versioning = useVersioning(object);
    const { document, activeBranch, activeVersion, checkpointContent, branchBaseContent, setSelection, setCompare } =
      versioning;
    const diffViewMode = settings.diffView ?? 'inline';
    const compareActive = versioning.compare && !!activeBranch && branchBaseContent !== undefined;
    const branchText = activeBranch?.content.target;
    const editorObject = activeVersion
      ? { id: `${id}--${activeVersion.id}`, text: checkpointContent ?? '' }
      : (branchText ?? object);
    const initialValue = activeVersion ? checkpointContent : (branchText?.content ?? docContent ?? textContent);
    const effectiveViewMode = activeVersion ? 'readonly' : viewMode;
    // Remount the editor when the selection or compare overlay changes so CodeMirror state rebinds cleanly.
    const editorKey = `${
      activeVersion ? `checkpoint-${activeVersion.id}` : activeBranch ? `branch-${activeBranch.id}` : 'current'
    }${compareActive ? `--compare-${diffViewMode}` : ''}`;

    const handleRestore = useCallback(() => {
      if (document && activeVersion) {
        restore(document, activeVersion);
        setSelection({ kind: 'current' });
      }
    }, [document, activeVersion, setSelection]);

    const handleBranchFrom = useCallback(() => {
      const target = activeVersion?.target.target;
      if (document && activeVersion && target) {
        const branch = createBranch(document, {
          name: `from: ${activeVersion.name}`,
          from: { target, heads: activeVersion.heads },
        });
        setSelection({ kind: 'branch', branchId: branch.id });
      }
    }, [document, activeVersion, setSelection]);

    const handleMerge = useCallback(() => {
      if (document && activeBranch) {
        mergeBranch(document, activeBranch);
        setSelection({ kind: 'current' });
      }
    }, [document, activeBranch, setSelection]);

    const handleCompare = useCallback(() => setCompare(!versioning.compare), [setCompare, versioning.compare]);

    const handleCloseBanner = useCallback(() => {
      setSelection({ kind: 'current' });
      setCompare(false);
    }, [setSelection, setCompare]);

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

    // Diff overlay (inline/gutter variants render inside the editor; sideBySide replaces it).
    const combinedExtensions = useMemo<Extension[]>(() => {
      if (compareActive && branchBaseContent !== undefined && diffViewMode !== 'sideBySide') {
        return [...extensions, versionDiff({ base: branchBaseContent, variant: diffViewMode })];
      }
      return extensions;
    }, [extensions, compareActive, branchBaseContent, diffViewMode]);

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
        key={editorKey}
        id={id}
        attendableId={attendableId}
        object={editorObject}
        compact={role !== AppSurface.Article.role}
        extensions={combinedExtensions}
        settings={settings}
        viewMode={effectiveViewMode}
        onAction={runAction}
        onFileUpload={handleFileUpload}
        onLinkQuery={handleLinkQuery}
        onSelectObject={handleSelectObject}
        {...props}
      >
        {(editorRootProps) => (
          <Editor.Root {...editorRootProps}>
            <Panel.Root role={role} ref={forwardedRef}>
              {settings.toolbar && (
                <Panel.Toolbar>
                  <MarkdownEditor.Toolbar classNames='dx-document' customActions={customActions} />
                </Panel.Toolbar>
              )}
              {activeVersion && (
                <VersionBanner
                  mode='checkpoint'
                  name={activeVersion.name}
                  detail={new Date(activeVersion.createdAt).toLocaleString()}
                  onRestore={handleRestore}
                  onBranchFrom={handleBranchFrom}
                  onClose={handleCloseBanner}
                />
              )}
              {activeBranch && (
                <VersionBanner
                  mode='branch'
                  name={activeBranch.name}
                  detail={new Date(activeBranch.createdAt).toLocaleString()}
                  onMerge={handleMerge}
                  onCompare={handleCompare}
                  onClose={handleCloseBanner}
                />
              )}
              <Panel.Content>
                {versioning.compare &&
                diffViewMode === 'sideBySide' &&
                branchText &&
                branchBaseContent !== undefined ? (
                  <DiffView before={branchBaseContent} after={branchText.content} />
                ) : (
                  <>
                    <MarkdownEditor.Content initialValue={initialValue} />
                    <MarkdownEditor.Blocks />
                  </>
                )}
              </Panel.Content>
            </Panel.Root>
          </Editor.Root>
        )}
      </MarkdownEditorProvider>
    );
  },
);

MarkdownArticle.displayName = 'MarkdownArticle';
