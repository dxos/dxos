//
// Copyright 2024 DXOS.org
//

import { Compartment, type Extension } from '@codemirror/state';
import { Atom } from '@effect-atom/atom-react';
import React, { forwardRef, useCallback, useEffect, useMemo } from 'react';

import { useCapabilities, useOperationInvoker } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useIdentity } from '@dxos/halo-react';
import { useActionRunner } from '@dxos/plugin-graph';
import { Panel } from '@dxos/react-ui';
import { ViewState } from '@dxos/react-ui-attention';
import { Editor, type ViewModeItem, defaultViewModeItems, useEditorContext } from '@dxos/react-ui-editor';
import { graphActions, isToolbarAction } from '@dxos/react-ui-menu';
import { Text } from '@dxos/schema';
import { type SuggestionSource, suggestionsOverlay } from '@dxos/ui-editor';

import {
  MarkdownEditor,
  type MarkdownEditorContentProps,
  MarkdownEditorProvider,
  type MarkdownEditorProviderProps,
} from '#components';
import { useLinkQuery, useVersioning } from '#hooks';
import { Markdown, MarkdownCapabilities, type MarkdownPluginState } from '#types';

import { mergeConflicts } from '../../extensions';
import { useReviewExtensions } from './useReviewExtensions';
import { useVersionedEditor } from './useVersionedEditor';
import { VersionToolbar } from './VersionToolbar';

export type MarkdownArticleProps = AppSurface.ObjectArticleProps<
  Markdown.Document | Text.Text,
  {
    id: string;
    settings: Markdown.Settings;
    viewState?: ViewState.Manager;
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
    {
      role,
      subject: object,
      id,
      attendableId,
      settings,
      extensionProviders,
      onSelectObject,
      viewMode,
      onViewModeChange,
      ...props
    },
    forwardedRef,
  ) => {
    const db = Obj.isObject(object) ? Obj.getDatabase(object) : undefined;
    const [docContent] = useObject(Obj.instanceOf(Markdown.Document, object) ? object.content : undefined, 'content');
    const [textContent] = useObject(Obj.instanceOf(Text.Text, object) ? object : undefined, 'content');

    // Local identity (collaboration awareness + suggestion authorship).
    const identity = useIdentity();

    // The accepted base (`main`) the review overlays diff against.
    const mainContent = docContent ?? textContent;

    // Version selection: swap the editor's subject to the active branch (a per-surface binding
    // for core branches, the forked Text for legacy ones); viewing a checkpoint pins the live
    // Text to historical heads (the hook manages the pin). Selection.Selection is per-user session state.
    const versioning = useVersioning(object);
    const { document, mode, setMode } = versioning;
    const editor = useVersionedEditor({
      object,
      versioning,
      identity,
      mainContent,
      diffView: settings.diffView,
      viewMode,
      id,
    });
    const {
      editorObject,
      initialValue,
      editorKey,
      effectiveViewMode,
      branchLoading,
      ambient,
      policy,
      suggestActive,
      branchText,
      reviewBranch,
      suggestionBranch,
    } = editor;

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
          const extension =
            typeof provider === 'function'
              ? provider({
                  document,
                  viewMode,
                  reviewBranch,
                  // Only when the editor is bound to the branch doc directly (Branch view) — in the
                  // diff/suggest overlay the editor stays on main, so anchors resolve against main.
                  branchText: suggestActive ? undefined : branchText,
                  suggestionBranch,
                  // Ambient view follows the review policy; the advanced paths always show comments.
                  showComments: ambient ? policy.showComments : true,
                })
              : provider;
          if (extension) {
            acc.push(extension);
          }

          return acc;
        }, []);
    }, [
      extensionProviders,
      otherExtensionProviders,
      object,
      viewMode,
      reviewBranch,
      branchText,
      suggestActive,
      suggestionBranch,
      ambient,
      policy.showComments,
    ]);

    // Review affordances: durable Accept/Reject ops, multi-author overlays, tracked changes, and the
    // compare/diff overlay — all versioning-model access for the review concern lives in the hook.
    const { invokePromise } = useOperationInvoker();
    const review = useReviewExtensions({
      object,
      versioning,
      editor,
      identity,
      mainContent,
      diffView: settings.diffView,
    });
    const { compareOverlay, overlay, overlaySources, overlayBase, setSuggestionSources, authorHues } = review;
    const [SuggestionSourcesProvider] = useCapabilities(MarkdownCapabilities.SuggestionSourcesProvider);

    // The compare overlay lives in a compartment (reconfigured live, see `compareCompartment`), so it
    // is intentionally absent here — its config changing must not alter this array, which would make
    // `useTextEditor` recreate the view. The review extensions (suggest overlay, own tracked changes)
    // are stable across keystrokes by construction (see the hook).
    const combinedExtensions = useMemo<Extension[]>(
      () => [...extensions, mergeConflicts(), compareCompartment.of([]), overlay.extension, ...review.reviewExtensions],
      [extensions, overlay, review.reviewExtensions],
    );

    // Toolbar actions from the app graph. Branch selection / suggest / return-to-main live in the
    // History companion (the advanced path); the ambient review mode (incl. Suggesting) is surfaced in
    // the editor view-mode dropdown below.
    const { graph } = useAppGraph();
    const runAction = useActionRunner();
    const customActions = useMemo(
      () => Atom.make((get) => graphActions(graph, get, attendableId ?? id, { filter: isToolbarAction })),
      [graph, attendableId, id],
    );

    // View-mode dropdown entries: the built-in editor modes plus any contributed review modes (e.g.
    // Suggesting from plugin-comments). On the ambient path the dropdown is the single GDocs-style mode
    // control — selecting a built-in also sets the review posture (source→editing, preview/readonly→
    // viewing) so leaving a contributed mode works; a contributed entry sets its review mode directly.
    // Off the ambient path (an explicit branch/checkpoint is selected) the review mode has no effect, so
    // only the built-in editor modes are shown.
    const viewModeExtensions = useCapabilities(MarkdownCapabilities.ViewModeExtension);
    const viewModes = useMemo<ViewModeItem[]>(() => {
      const current = viewMode ?? 'source';
      const contributed: ViewModeItem[] = ambient
        ? [...viewModeExtensions]
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map((extension) => ({
              id: extension.id,
              icon: extension.icon,
              label: extension.label,
              checked: mode === extension.reviewMode,
              onSelect: () => setMode(extension.reviewMode),
            }))
        : [];
      const contributedActive = contributed.some((item) => item.checked);
      const builtin: ViewModeItem[] = defaultViewModeItems.map((item) => ({
        ...item,
        // A contributed mode owns the single checked slot when active; otherwise the built-in matching
        // the current editor view mode is checked.
        checked: !contributedActive && item.id === current,
        onSelect: () => {
          onViewModeChange?.(item.id);
          if (ambient) {
            setMode(item.id === 'source' ? 'editing' : 'viewing');
          }
        },
      }));
      return [...builtin, ...contributed];
    }, [viewMode, ambient, mode, setMode, onViewModeChange, viewModeExtensions]);

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
        onViewModeChange={onViewModeChange}
        {...props}
      >
        {(editorRootProps) => (
          <Editor.Root {...editorRootProps}>
            <RegisterEditorView id={id} attendableId={attendableId} />
            <CompareOverlay overlay={compareOverlay} />
            {/* Ambient review: enumerate every author's suggestion branches (invisible bridge) and
                overlay them live; both are no-ops off the ambient path or when no provider exists. */}
            {ambient && document && SuggestionSourcesProvider && (
              <SuggestionSourcesProvider document={document} authorHues={authorHues} onSources={setSuggestionSources} />
            )}
            <SuggestionsOverlay
              overlay={overlay}
              sources={overlaySources}
              base={overlayBase}
              enabled={ambient && policy.showSuggestions}
            />
            <Panel.Root role={role} ref={forwardedRef}>
              {settings.toolbar && (
                <Panel.Toolbar>
                  <MarkdownEditor.Toolbar
                    classNames='dx-document'
                    customActions={customActions}
                    viewModes={viewModes}
                  />
                </Panel.Toolbar>
              )}
              <Panel.Content classNames='flex flex-col'>
                <VersionToolbar versioning={versioning} />
                <MarkdownEditor.Content initialValue={initialValue} />
                <Editor.Blocks />
                {/* Developer diagnostics panel (live editor state), gated behind the debug setting. */}
                {settings.debug && <Editor.Diagnostics />}
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

/**
 * Reconfigures the ambient multi-author suggestion overlay (the shared `@dxos/ui-editor` factory) on
 * the live editor as the resolved sources or review mode change — no remount (see
 * {@link suggestionsOverlay}). Must render inside `Editor.Root`.
 */
const SuggestionsOverlay = ({
  overlay,
  sources,
  base,
  enabled,
}: {
  overlay: ReturnType<typeof suggestionsOverlay>;
  sources: SuggestionSource[];
  /** The accepted base (main) sources are diffed against when the editor is bound to a diverged branch. */
  base?: string;
  enabled: boolean;
}) => {
  const { controller } = useEditorContext('MarkdownArticle.SuggestionsOverlay');
  const view = controller?.view;
  useEffect(() => {
    if (view) {
      overlay.reconfigure(view, sources, enabled, base);
    }
  }, [view, overlay, sources, enabled, base]);

  return null;
};
