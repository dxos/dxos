//
// Copyright 2026 DXOS.org
//

import { useEffect, useState } from 'react';

import { useCapabilities } from '@dxos/app-framework/ui';
import { type Identity } from '@dxos/halo';
import { log } from '@dxos/log';
import { type Markdown } from '@dxos/plugin-markdown/types';
import { Text } from '@dxos/schema';
import { type EditorViewMode } from '@dxos/ui-editor/types';
import { Branch } from '@dxos/versioning';

import { ReviewCapabilities } from '../types';
import { type useVersioning } from './useVersioning';

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

  // Default branch compare to the accept/reject review overlay ('suggest'); the read-only diff
  // modes (inline/sideBySide/gutter) are opt-in via settings.
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
  // absent (e.g. a bare story host) ⇒ the GDocs-parity default.
  const [reviewRenderPolicy] = useCapabilities(ReviewCapabilities.ReviewRenderPolicy);
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

  // While a core-branch binding is resolving, the editor must not mount against the root object
  // — edits would silently land on main. Render an empty panel until the binding is ready. The
  // same applies to a branch CHECKPOINT: its content is read from the branch-bound Text, which
  // resolves asynchronously; mounting before it is ready would seed the editor with empty text and
  // never recover (the editor key does not change when the binding later resolves).
  const branchLoading =
    // The base view renders a detached parent snapshot, so it does not wait on the branch binding.
    (!!activeBranch && !branchText && !baseActive) ||
    // Any checkpoint, not just a branch one: a root checkpoint reads its text through a ref that may
    // still be loading, and the `checkpoint-*` key does not change when it resolves — the editor would
    // stay blank.
    (!!activeVersion && !checkpointText) ||
    (!!activeFork && forkContent === undefined) ||
    // Ambient Suggesting waits on the user's own branch binding so edits never land on main.
    (ambientSuggesting && !ownBranchText);

  // Checkpoint and fork both render read-only from a DETACHED content snapshot, never the live
  // (pinned) object: binding CodeMirror's automerge sync to a time-travelled doc mismatches (CM
  // holds the tip text while the historical read is shorter → out-of-range splice). A checkpoint
  // shows a version's pinned heads; a fork shows the parent content at the branch anchor.
  const readonlySnapshot = activeVersion
    ? { key: `checkpoint-${activeVersion.id}`, content: checkpointContent }
    : activeFork
      ? { key: `fork-${activeFork.id}`, content: forkContent }
      : baseActive
        ? { key: `base-${activeBranch?.id}`, content: branchBaseContent }
        : undefined;
  const editorObject = readonlySnapshot
    ? { id: `${id}--${readonlySnapshot.key}`, text: readonlySnapshot.content ?? '' }
    : suggestActive
      ? object
      : ambientSuggesting && ownBranchText
        ? ownBranchText
        : (branchText ?? object);
  const initialValue = readonlySnapshot
    ? readonlySnapshot.content
    : suggestActive
      ? mainContent
      : ambientSuggesting && ownBranchText
        ? ownBranchText.content
        : (branchText?.content ?? mainContent);
  // Ambient Viewing (policy not editable) forces read-only without touching the advanced path.
  const effectiveViewMode = readonlySnapshot || suggestActive || !ambientEditable ? 'readonly' : viewMode;
  // Remount only when the editor's bound document changes (checkpoint/fork snapshot, branch, or the
  // suggest overlay which rebinds to the parent). Toggling Compare keeps the same binding — its
  // overlay is reconfigured live via the compare compartment, so it is deliberately NOT in the key. A
  // review-mode switch changes `effectiveViewMode`, which `useTextEditor` already reconfigures for.
  const editorKey = readonlySnapshot
    ? readonlySnapshot.key
    : suggestActive
      ? `suggest-${activeBranch?.id}`
      : ambientSuggesting
        ? 'suggesting'
        : activeBranch
          ? `branch-${activeBranch.id}`
          : 'current';

  return {
    editorObject,
    initialValue,
    editorKey,
    effectiveViewMode,
    branchLoading,
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
