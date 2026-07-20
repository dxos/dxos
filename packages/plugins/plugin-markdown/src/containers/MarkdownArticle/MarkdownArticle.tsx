//
// Copyright 2024 DXOS.org
//

import { Compartment, type Extension } from '@codemirror/state';
import { Atom } from '@effect-atom/atom-react';
import React, { forwardRef, useCallback, useEffect, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, CollaborationOperation, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { useObject } from '@dxos/echo-react';
import { useIdentity } from '@dxos/halo-react';
import { useActionRunner } from '@dxos/plugin-graph';
import { Panel } from '@dxos/react-ui';
import { type ViewStateManager } from '@dxos/react-ui-attention';
import { Editor, useEditorContext } from '@dxos/react-ui-editor';
import {
  type ToolbarMenuActionGroupProperties,
  createMenuAction,
  createMenuItemGroup,
  graphActions,
  isToolbarAction,
} from '@dxos/react-ui-menu';
import { Text } from '@dxos/schema';
import { type DiffHunk, diffView, suggestChanges } from '@dxos/ui-editor';
import { Branch } from '@dxos/versioning';

import {
  MarkdownEditor,
  type MarkdownEditorContentProps,
  MarkdownEditorProvider,
  type MarkdownEditorProviderProps,
} from '#components';
import { useLinkQuery, useVersioning } from '#hooks';
import { meta } from '#meta';
import { Markdown, MarkdownCapabilities, type MarkdownPluginState } from '#types';

import { mergeConflicts, versionDiff } from '../../extensions';
import { VersionBanners } from './VersionBanners';

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

// The compare/diff overlay is swapped in and out through a compartment so toggling Compare
// reconfigures the live editor rather than remounting it (which would rebind automerge and lose
// scroll/selection). The branch binding is unchanged while comparing, so only the overlay moves.
const compareCompartment = new Compartment();

export const MarkdownArticle = forwardRef<HTMLDivElement, MarkdownArticleProps>(
  (
    { role, subject: object, id, attendableId, settings, extensionProviders, onSelectObject, viewMode, ...props },
    forwardedRef,
  ) => {
    const db = Obj.isObject(object) ? Obj.getDatabase(object) : undefined;
    const [docContent] = useObject(Obj.instanceOf(Markdown.Document, object) ? object.content : undefined, 'content');
    const [textContent] = useObject(Obj.instanceOf(Text.Text, object) ? object : undefined, 'content');

    // Version selection: swap the editor's subject to the active branch (a per-surface binding
    // for core branches, the forked Text for legacy ones); viewing a checkpoint pins the live
    // Text to historical heads (the hook manages the pin). Selection is per-user session state.
    const versioning = useVersioning(object);
    const {
      document,
      activeBranch,
      activeFork,
      forkContent,
      activeVersion,
      checkpointText,
      checkpointContent,
      branchBaseContent,
      setSelection,
    } = versioning;
    // Default branch compare to the accept/reject review overlay ('suggest'); the read-only diff
    // modes (inline/sideBySide/gutter) are opt-in via settings.
    const diffViewMode = settings.diffView ?? 'suggest';
    const compareActive = versioning.compare && !!activeBranch && branchBaseContent !== undefined;
    const branchText = activeBranch ? versioning.activeText : undefined;
    // Suggestion review: instead of binding the editor to the branch, keep it on the parent (main)
    // and overlay the branch's changes as accept/reject suggestions. Accepting a change splices it
    // into the parent (merging it); rejecting hides it. The editor stays read-only — edits are made
    // only through the accept controls.
    const suggestActive = compareActive && diffViewMode === 'suggest' && branchText !== undefined;
    // The core branch the editor is showing (undefined = main, or a legacy content-copy branch which
    // carries no registry key). Threaded to extension providers so branch-review affordances (e.g.
    // comments) scope to the branch in view.
    const reviewBranch = activeBranch && Branch.isCore(activeBranch) ? activeBranch.key : undefined;
    // While a core-branch binding is resolving, the editor must not mount against the root object
    // — edits would silently land on main. Render an empty panel until the binding is ready. The
    // same applies to a branch CHECKPOINT: its content is read from the branch-bound Text, which
    // resolves asynchronously; mounting before it is ready would seed the editor with empty text and
    // never recover (the editor key does not change when the binding later resolves).
    const branchLoading =
      (!!activeBranch && !branchText) ||
      (!!activeVersion?.branch && !checkpointText) ||
      (!!activeFork && forkContent === undefined);
    // Checkpoint and fork both render read-only from a DETACHED content snapshot, never the live
    // (pinned) object: binding CodeMirror's automerge sync to a time-travelled doc mismatches (CM
    // holds the tip text while the historical read is shorter → out-of-range splice). A checkpoint
    // shows a version's pinned heads; a fork shows the parent content at the branch anchor.
    const readonlySnapshot = activeVersion
      ? { key: `checkpoint-${activeVersion.id}`, content: checkpointContent }
      : activeFork
        ? { key: `fork-${activeFork.id}`, content: forkContent }
        : undefined;
    const editorObject = readonlySnapshot
      ? { id: `${id}--${readonlySnapshot.key}`, text: readonlySnapshot.content ?? '' }
      : suggestActive
        ? object
        : (branchText ?? object);
    const initialValue = readonlySnapshot
      ? readonlySnapshot.content
      : suggestActive
        ? (docContent ?? textContent)
        : (branchText?.content ?? docContent ?? textContent);
    const effectiveViewMode = readonlySnapshot || suggestActive ? 'readonly' : viewMode;
    // Remount only when the editor's bound document changes (checkpoint/fork snapshot, branch, or the
    // suggest overlay which rebinds to the parent). Toggling Compare keeps the same binding — its
    // overlay is reconfigured live via `compareCompartment`, so it is deliberately NOT in the key.
    const editorKey = readonlySnapshot
      ? readonlySnapshot.key
      : suggestActive
        ? `suggest-${activeBranch?.id}`
        : activeBranch
          ? `branch-${activeBranch.id}`
          : 'current';

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
          const extension = typeof provider === 'function' ? provider({ document, viewMode, reviewBranch }) : provider;
          if (extension) {
            acc.push(extension);
          }

          return acc;
        }, []);
    }, [extensionProviders, otherExtensionProviders, object, viewMode, reviewBranch]);

    // Route the inline suggestion Accept/Reject controls through the durable, undoable collaboration
    // ops. The anchor is a cursor range over the parent (main) content — the editor is bound to main
    // in suggest mode — and `branch` is the compare (author) branch key (`reviewBranch`).
    const { invokePromise } = useOperationInvoker();
    const handleAcceptChange = useCallback(
      (hunk: DiffHunk) => {
        const content = Obj.instanceOf(Markdown.Document, object) ? object.content?.target : undefined;
        if (!content || !reviewBranch) {
          return;
        }
        const anchor = toCursorRange(Doc.createAccessor(content, ['content']), hunk.from, hunk.to);
        void invokePromise?.(CollaborationOperation.AcceptChange, { subject: object, anchor, branch: reviewBranch });
      },
      [object, reviewBranch, invokePromise],
    );
    const handleRejectChange = useCallback(
      (hunk: DiffHunk) => {
        const content = Obj.instanceOf(Markdown.Document, object) ? object.content?.target : undefined;
        if (!content || !reviewBranch) {
          return;
        }
        const anchor = toCursorRange(Doc.createAccessor(content, ['content']), hunk.from, hunk.to);
        void invokePromise?.(CollaborationOperation.RejectChange, { subject: object, anchor, branch: reviewBranch });
      },
      [object, reviewBranch, invokePromise],
    );

    // The compare overlay lives in a compartment (reconfigured live, see `compareCompartment`), so it
    // is intentionally absent here — its config changing must not alter this array, which would make
    // `useTextEditor` recreate the view. The suggest overlay stays baked in: it rebinds the editor to
    // the parent and so already remounts via `editorKey`.
    const combinedExtensions = useMemo<Extension[]>(() => {
      const list = [...extensions, mergeConflicts(), compareCompartment.of([])];
      if (suggestActive && branchText) {
        // Editor is bound to the parent; the branch content is the proposal. Accept cherry-picks the
        // hunk into the parent (AcceptChange); reject reverts it on the author's branch (RejectChange).
        list.push(
          suggestChanges({
            proposal: branchText.content,
            onAccept: handleAcceptChange,
            onReject: handleRejectChange,
          }),
        );
      }
      return list;
    }, [extensions, suggestActive, branchText, handleAcceptChange, handleRejectChange]);

    // Diff overlay over the live (editable) branch editor: the lightweight inline/gutter variants use
    // the custom versionDiff decorations; sideBySide uses the richer editable unified merge overlay
    // (codemirror merge chunks with review-oriented colouring) — the branch stays editable in every
    // mode, so a reviewer can adjust the draft while seeing it diffed against the anchor.
    const compareOverlay = useMemo<Extension | undefined>(() => {
      if (compareActive && branchBaseContent !== undefined && diffViewMode !== 'suggest') {
        return diffViewMode === 'sideBySide'
          ? diffView({ original: branchBaseContent })
          : versionDiff({ base: branchBaseContent, variant: diffViewMode });
      }
      return undefined;
    }, [compareActive, branchBaseContent, diffViewMode]);

    // Toolbar actions from app graph, plus the branch switcher dropdown.
    const { graph } = useAppGraph();
    const runAction = useActionRunner();
    const activeBranches = document?.history?.branches.filter((branch) => branch.status === 'active') ?? [];
    const branchesKey = activeBranches.map((branch) => `${branch.id}:${branch.name}`).join(',');
    const customActions = useMemo(() => {
      return Atom.make((get) => {
        const base = graphActions(graph, get, attendableId ?? id, { filter: isToolbarAction });
        if (!document || activeBranches.length === 0) {
          return base;
        }

        const groupId = 'versions';
        const group = createMenuItemGroup(groupId, {
          label: ['versions.title', { ns: meta.profile.key }],
          icon: 'ph--git-branch--regular',
          iconOnly: true,
          variant: 'dropdownMenu',
          applyActive: false,
          selectCardinality: 'single',
        } satisfies ToolbarMenuActionGroupProperties);
        const actions = [
          createMenuAction('versions--current', () => setSelection({ kind: 'current' }), {
            label: ['main-branch.label', { ns: meta.profile.key }],
            icon: 'ph--git-branch--regular',
            checked: !activeBranch && !activeVersion,
          }),
          ...activeBranches.map((branch) =>
            createMenuAction(`versions--${branch.id}`, () => setSelection({ kind: 'branch', branchId: branch.id }), {
              label: Branch.label(branch),
              icon: 'ph--git-branch--regular',
              checked: activeBranch?.id === branch.id,
            }),
          ),
        ];

        return {
          nodes: [...base.nodes, group, ...actions],
          edges: [
            ...base.edges,
            { source: 'root', target: groupId, relation: 'child' as const },
            ...actions.map((action) => ({ source: groupId, target: action.id, relation: 'child' as const })),
          ],
        };
      });
    }, [graph, attendableId, id, document, branchesKey, activeBranch?.id, activeVersion?.id, setSelection]);

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

    if (branchLoading) {
      return <Panel.Root role={role} ref={forwardedRef} />;
    }

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
            <CompareOverlay overlay={compareOverlay} />
            <Panel.Root role={role} ref={forwardedRef}>
              {settings.toolbar && (
                <Panel.Toolbar>
                  <MarkdownEditor.Toolbar classNames='dx-document' customActions={customActions} />
                </Panel.Toolbar>
              )}
              <Panel.Content classNames='flex flex-col'>
                <VersionBanners versioning={versioning} />
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

/**
 * Reconfigures the compare/diff overlay on the live editor when Compare is toggled, avoiding a
 * remount. Must render inside `Editor.Root`.
 */
const CompareOverlay = ({ overlay }: { overlay?: Extension }) => {
  const { controller } = useEditorContext('MarkdownArticle.CompareOverlay');
  const view = controller?.view;
  useEffect(() => {
    if (view) {
      view.dispatch({ effects: compareCompartment.reconfigure(overlay ?? []) });
    }
  }, [view, overlay]);

  return null;
};
