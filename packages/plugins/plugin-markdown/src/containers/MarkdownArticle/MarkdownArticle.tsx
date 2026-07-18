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
import { useIdentity } from '@dxos/halo-react';
import { log } from '@dxos/log';
import { useActionRunner } from '@dxos/plugin-graph';
import { type SpaceCapabilities } from '@dxos/plugin-space';
import { useObject } from '@dxos/react-client/echo';
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
import { diffView } from '@dxos/ui-editor';
import { Branch, Version } from '@dxos/versioning';

import {
  MarkdownEditor,
  type MarkdownEditorContentProps,
  MarkdownEditorProvider,
  type MarkdownEditorProviderProps,
  VersionBanner,
} from '#components';
import { useLinkQuery, useVersioning } from '#hooks';
import { meta } from '#meta';
import { Markdown, MarkdownCapabilities, type MarkdownPluginState } from '#types';

import { mergeConflicts, versionDiff } from '../../extensions';

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

    // Version selection: swap the editor's subject to the active branch (a per-surface binding
    // for core branches, the forked Text for legacy ones); viewing a checkpoint pins the live
    // Text to historical heads (the hook manages the pin). Selection is per-user session state.
    const versioning = useVersioning(object);
    const {
      document,
      activeBranch,
      activeVersion,
      checkpointText,
      checkpointContent,
      branchBaseContent,
      setSelection,
      setCompare,
    } = versioning;
    const diffViewMode = settings.diffView ?? 'inline';
    const compareActive = versioning.compare && !!activeBranch && branchBaseContent !== undefined;
    const branchText = activeBranch ? versioning.activeText : undefined;
    // The core branch the editor is showing (undefined = main, or a legacy content-copy branch which
    // carries no registry key). Threaded to extension providers so branch-review affordances (e.g.
    // comments) scope to the branch in view.
    const reviewBranch = activeBranch && Branch.isCore(activeBranch) ? activeBranch.key : undefined;
    // While a core-branch binding is resolving, the editor must not mount against the root object
    // — edits would silently land on main. Render an empty panel until the binding is ready. The
    // same applies to a branch CHECKPOINT: its content is read from the branch-bound Text, which
    // resolves asynchronously; mounting before it is ready would seed the editor with empty text and
    // never recover (the editor key does not change when the binding later resolves).
    const branchLoading = (!!activeBranch && !branchText) || (!!activeVersion?.branch && !checkpointText);
    // A checkpoint is shown read-only from a DETACHED content snapshot, not the live (pinned) object:
    // binding CodeMirror's automerge sync to a time-travelled doc mismatches (CM holds the tip text
    // while the pinned doc reads the shorter historical text → out-of-range splice). The pin still
    // drives non-editor surfaces (label, companion). Branch view binds the live branch Text.
    const editorObject = activeVersion
      ? { id: `${id}--${activeVersion.id}`, text: checkpointContent ?? '' }
      : (branchText ?? object);
    const initialValue = activeVersion ? checkpointContent : (branchText?.content ?? docContent ?? textContent);
    const effectiveViewMode = activeVersion ? 'readonly' : viewMode;
    // Remount the editor when the selection or compare overlay changes so CodeMirror state rebinds cleanly.
    const editorKey = `${
      activeVersion ? `checkpoint-${activeVersion.id}` : activeBranch ? `branch-${activeBranch.id}` : 'current'
    }${compareActive ? `--compare-${diffViewMode}` : ''}`;

    // Leaving a checkpoint view returns to the tip it belongs to: the branch the checkpoint was
    // taken on (so the reviewer lands back on the editable branch tip), else main's present.
    const branchOfActiveVersion = useCallback(() => {
      const branchKey = activeVersion?.branch;
      return branchKey
        ? document?.history?.branches.find((branch) => branch.key === branchKey && branch.status === 'active')
        : undefined;
    }, [document, activeVersion]);
    const tipSelection = useCallback((): SpaceCapabilities.VersionSelection => {
      const branch = branchOfActiveVersion();
      return branch ? { kind: 'branch', branchId: branch.id } : { kind: 'current' };
    }, [branchOfActiveVersion]);

    const handleRestore = useCallback(() => {
      if (document && activeVersion) {
        // A branch checkpoint restores onto the branch document (checkpointText is the branch-bound
        // Text); a base checkpoint onto the root.
        Version.restore(document, activeVersion, checkpointText);
        setSelection(tipSelection());
      }
    }, [document, activeVersion, checkpointText, setSelection, tipSelection]);

    const handleBranchFrom = useCallback(
      (name: string) => {
        const target = activeVersion?.target.target;
        if (document && activeVersion && target) {
          Branch.create(document, {
            name: name.trim(),
            parent: target,
            heads: activeVersion.heads,
          })
            .then((branch) => setSelection({ kind: 'branch', branchId: branch.id }))
            .catch((error) => log.catch(error));
        }
      },
      [document, activeVersion, setSelection],
    );

    const handleMerge = useCallback(() => {
      if (document && activeBranch) {
        Branch.merge(document, activeBranch)
          .then(() => setSelection({ kind: 'current' }))
          .catch((error) => log.catch(error));
      }
    }, [document, activeBranch, setSelection]);

    const handleCompare = useCallback(() => setCompare(!versioning.compare), [setCompare, versioning.compare]);

    const handleCloseBanner = useCallback(() => {
      // Closing a branch-checkpoint banner returns to the branch tip, not main.
      setSelection(tipSelection());
      setCompare(false);
    }, [setSelection, setCompare, tipSelection]);

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

    // Diff overlay over the live (editable) branch editor: the lightweight inline/gutter variants
    // use the custom versionDiff decorations; sideBySide uses the richer editable unified merge
    // overlay (codemirror merge chunks with review-oriented colouring) — the branch stays editable
    // in every mode, so a reviewer can adjust the draft while seeing it diffed against the anchor.
    const combinedExtensions = useMemo<Extension[]>(() => {
      const list = [...extensions, mergeConflicts()];
      if (compareActive && branchBaseContent !== undefined) {
        list.push(
          diffViewMode === 'sideBySide'
            ? diffView({ original: branchBaseContent })
            : versionDiff({ base: branchBaseContent, variant: diffViewMode }),
        );
      }
      return list;
    }, [extensions, compareActive, branchBaseContent, diffViewMode]);

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
      // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <Panel.Root role={role} ref={forwardedRef}>
              {settings.toolbar && (
                <Panel.Toolbar>
                  <MarkdownEditor.Toolbar classNames='dx-document' customActions={customActions} />
                </Panel.Toolbar>
              )}
              {activeVersion && (
                <VersionBanner
                  mode='checkpoint'
                  name={Version.label(activeVersion)}
                  detail={activeVersion.name ? new Date(activeVersion.createdAt).toLocaleString() : undefined}
                  onRestore={handleRestore}
                  // Branching from a BRANCH revision would fork a sub-branch, which is unsupported
                  // (flat core registry) — offer it only for main revisions. See DESIGN.md.
                  onBranchFrom={activeVersion.branch ? undefined : handleBranchFrom}
                  onClose={handleCloseBanner}
                />
              )}
              {activeBranch && (
                <VersionBanner
                  mode='branch'
                  name={Branch.label(activeBranch)}
                  detail={new Date(activeBranch.createdAt).toLocaleString()}
                  onMerge={handleMerge}
                  onCompare={handleCompare}
                  onClose={handleCloseBanner}
                />
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
