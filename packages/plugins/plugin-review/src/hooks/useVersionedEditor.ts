//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { useOptionalCapabilities } from '@dxos/app-framework/ui';
import { type Identity } from '@dxos/halo';
import { log } from '@dxos/log';
import type * as Markdown from '@dxos/plugin-markdown/Markdown';
import { Text } from '@dxos/schema';
import { type EditorViewMode } from '@dxos/ui-editor/types';
import { Branch } from '@dxos/versioning';

import { ReviewCapabilities } from '#types';

import { deriveBinding } from './review-lifecycle.ts';
import { type useVersioning } from './useVersioning.ts';

export type VersionedEditorProps = {
  object: Markdown.Document | Text.Text;
  versioning: ReturnType<typeof useVersioning>;
  identity: Identity.Info | null | undefined;
  /** The document's live (main) content — the accepted base overlays diff against. */
  mainContent: string | undefined;
  diffView: Markdown.Settings['diffView'];
  viewMode?: EditorViewMode;
  /** Stable id for the surface; the snapshot editor key derives from it. */
  id: string;
};

export type VersionedEditor = {
  /** The subject the editor binds to: the object, a branch Text, a snapshot stand-in, or the user's own suggestion branch. */
  editorObject: Markdown.Document | Text.Text | { id: string; text: string };
  initialValue: string | undefined;
  /** Remount key: changes only when the editor's bound document changes. */
  editorKey: string;
  effectiveViewMode: EditorViewMode | undefined;
  /** True while a branch/checkpoint binding resolves — the editor must not mount against the root. */
  branchLoading: boolean;
  // Derived review state consumed by the extension/overlay layer and the view-mode dropdown.
  ambient: boolean;
  policy: ReviewCapabilities.ReviewRenderConfig;
  ambientSuggesting: boolean;
  suggestActive: boolean;
  compareActive: boolean;
  branchText: Text.Text | undefined;
  ownBranchText: Text.Text | undefined;
  reviewBranch: string | undefined;
  suggestionBranch: boolean;
};

/**
 * Version selection → editor binding: swaps the editor's subject to the active branch (a per-surface
 * binding for core branches, the forked Text for legacy ones); a checkpoint/fork/base renders a
 * detached read-only snapshot; Ambient Suggesting binds to the CURRENT USER's own suggestion branch
 * (find-or-create) so typed edits accrue there for review rather than mutating main. Concentrates
 * plugin-markdown's dependency on the versioning model for the editor-binding concern.
 */
export const useVersionedEditor = ({
  object,
  versioning,
  identity,
  mainContent,
  diffView,
  viewMode,
  id,
}: VersionedEditorProps): VersionedEditor => {
  const {
    document,
    activeBranch,
    activeFork,
    forkContent,
    activeVersion,
    checkpointText,
    checkpointContent,
    branchBaseContent,
    selection,
    mode,
  } = versioning;

  // Default branch compare to the accept/reject review overlay ('suggest'); the inline/sideBySide/
  // gutter diff variants are opt-in via settings and keep the branch editable — a reviewer can
  // adjust the draft while seeing it diffed against the anchor (see useReviewExtensions).
  const diffViewMode = diffView ?? 'suggest';
  const compareActive = versioning.view === 'diff' && !!activeBranch && branchBaseContent !== undefined;
  // The `base` view shows the parent content at the branch anchor read-only (the state the branch
  // diverged from) — rendered from a detached snapshot like a checkpoint/fork, never the live doc.
  const baseActive = versioning.view === 'base' && !!activeBranch && branchBaseContent !== undefined;
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
  // Per-user suggestion branches prohibit inline comments (review happens on the suggestion card);
  // comments are allowed on main and on draft branches.
  const suggestionBranch = activeBranch?.kind === 'suggestion';
  // Ambient review model: the default view (`selection.kind === 'current'`) stays bound to main and
  // overlays every author's suggestions plus comments per the per-user review mode. Any explicit
  // selection (branch/checkpoint/fork) keeps the advanced behaviour untouched — the policy is
  // consulted only on the ambient path. The policy capability is contributed by plugin-space (A2);
  // absent (e.g. a host that does not install it) ⇒ the GDocs-parity default.
  const [reviewRenderPolicy] = useOptionalCapabilities(ReviewCapabilities.ReviewRenderPolicy);
  const renderPolicy = reviewRenderPolicy ?? ReviewCapabilities.defaultReviewRenderPolicy;
  const ambient = selection.kind === 'current';
  const policy = renderPolicy(mode);
  const ambientEditable = ambient ? policy.editable : true;

  // Ambient Suggesting: instead of binding the editor to main, bind it to the CURRENT USER's own
  // `kind:'suggestion'` branch (find-or-create) so typed edits accrue there for review rather than
  // mutating main. Bound per-surface like `useVersioning` does for a selected branch; the mount is
  // guarded by `branchLoading` until the binding resolves, so edits never land on main.
  const ambientSuggesting = ambient && mode === 'suggesting';
  const [ownBranchText, setOwnBranchText] = useState<Text.Text | undefined>(undefined);
  const ownBranchParent = document?.content?.target;
  useEffect(() => {
    const creator = identity?.did;
    if (!ambientSuggesting || !document || !ownBranchParent || !creator) {
      setOwnBranchText(undefined);
      return;
    }
    let disposed = false;
    let binding: Awaited<ReturnType<typeof Branch.bind>> | undefined;
    Branch.suggestion(document, ownBranchParent, creator)
      .then((branch) => Branch.bind(document, branch))
      .then((next) => {
        if (disposed) {
          next.dispose();
          return;
        }
        binding = next;
        setOwnBranchText(next.object);
      })
      .catch((error) => log.catch(error));
    return () => {
      disposed = true;
      binding?.dispose();
      setOwnBranchText(undefined);
    };
  }, [ambientSuggesting, document, ownBranchParent, identity?.did]);

  // The binding decision itself is pure (see review-lifecycle.ts): everything async or model-shaped
  // is flattened to plain inputs here, so each transition is covered by table tests rather than
  // re-derived per surface.
  const binding = deriveBinding({
    mode,
    viewMode,
    policy,
    selection: selection.kind,
    branchId: activeBranch?.id,
    versionId: activeVersion?.id,
    forkId: activeFork?.id,
    compareActive,
    baseActive,
    suggestActive,
    branchBound: !!branchText,
    checkpointResolved: !!checkpointText,
    forkResolved: forkContent !== undefined,
    ownBranchBound: !!ownBranchText,
  });

  const snapshotContent =
    selection.kind === 'checkpoint' ? checkpointContent : selection.kind === 'fork' ? forkContent : branchBaseContent;
  const editorObject =
    binding.subject === 'snapshot'
      ? { id: `${id}--${binding.snapshotKey}`, text: snapshotContent ?? '' }
      : // The descriptor only selects these subjects when the binding resolved, so the fallback to
        // `object` is unreachable — kept over a non-null assertion per the no-cast rule.
        binding.subject === 'own-branch'
        ? (ownBranchText ?? object)
        : binding.subject === 'branch'
          ? (branchText ?? object)
          : object;
  const initialValue =
    binding.subject === 'snapshot'
      ? snapshotContent
      : binding.subject === 'own-branch'
        ? ownBranchText?.content
        : binding.subject === 'branch'
          ? branchText?.content
          : mainContent;

  return {
    editorObject,
    initialValue,
    editorKey: binding.editorKey,
    effectiveViewMode: binding.effectiveViewMode,
    branchLoading: binding.loading,
    ambient,
    policy,
    ambientSuggesting,
    suggestActive,
    compareActive,
    branchText,
    ownBranchText,
    reviewBranch,
    suggestionBranch,
  };
};
