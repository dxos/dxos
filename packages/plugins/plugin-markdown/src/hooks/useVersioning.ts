//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { type Database, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { VersioningCapabilities } from '@dxos/plugin-versioning';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { type Text } from '@dxos/schema';
import { Branch, History, Version } from '@dxos/versioning';

import { Markdown } from '../types';

export type UseVersioningResult = {
  document?: Markdown.Document;
  history?: History.History;
  selection: VersioningCapabilities.VersionSelection;
  setSelection: (selection: VersioningCapabilities.VersionSelection) => void;
  /** Active branch view (base parent / diff overlay / branch draft); only meaningful with a branch selected. */
  view: VersioningCapabilities.BranchView;
  setView: (view: VersioningCapabilities.BranchView) => void;
  /** Per-user editing posture for this document (Google-Docs-style). Missing entry = `editing`. */
  mode: VersioningCapabilities.ReviewMode;
  setMode: (mode: VersioningCapabilities.ReviewMode) => void;
  /** The branch being viewed (selection.kind === 'branch'). */
  activeBranch?: Branch.Branch;
  /** The branch whose fork point is being viewed (selection.kind === 'fork'). */
  activeFork?: Branch.Branch;
  /** Read-only parent content at the fork point (the state the branch was created from). */
  forkContent?: string;
  /**
   * The Text object the editor should bind to: a per-surface branch binding for core branches,
   * the legacy branch Text for content-copy branches, or the root (pinned to the checkpoint's
   * heads while a checkpoint is selected).
   */
  activeText?: Text.Text;
  /** The checkpoint being viewed (selection.kind === 'checkpoint'). */
  activeVersion?: Version.Version;
  /**
   * The Text the active checkpoint resolves against: the branch-bound Text for a branch checkpoint,
   * else the checkpoint's root target. Pass to `Version.contentAt`/`restore` so a branch checkpoint
   * acts on the branch document.
   */
  checkpointText?: Text.Text;
  /** Read-only content at the selected checkpoint. */
  checkpointContent?: string;
  /** Parent content at the active branch's anchor (the compare/merge base). */
  branchBaseContent?: string;
};

/**
 * Per-user version selection for a document plus the derived model objects.
 * Selection is session-local: collaborators each view their own version.
 */
export const useVersioning = (subject?: unknown): UseVersioningResult => {
  const document = Obj.instanceOf(Markdown.Document, subject) ? (subject as Markdown.Document) : undefined;
  // Version view state is a per-object ViewState aspect (contributed by plugin-attention's manager).
  // A markdown editor can render standalone without a provider (e.g. plugin-blogger, cards, previews),
  // so the hooks fall back to the aspect default and the version UI simply does not engage.
  const documentId = document?.id;
  const perObject = useViewState(VersioningCapabilities.viewAspect, documentId);
  const { update } = useViewStateActions(VersioningCapabilities.viewAspect, documentId);

  // Subscribe to history mutations (checkpoints/branches added elsewhere).
  useObject(document, 'history');
  const [rootText] = [document?.content.target];
  useObject(document?.content);

  const selection = perObject.selection ?? { kind: 'current' as const };
  const view = perObject.view ?? 'branch';
  const mode = perObject.mode ?? 'editing';

  const setSelection = useCallback(
    (next: VersioningCapabilities.VersionSelection) => update((prev) => ({ ...prev, selection: next })),
    [update],
  );

  const setView = useCallback(
    (next: VersioningCapabilities.BranchView) => update((prev) => ({ ...prev, view: next })),
    [update],
  );

  const setMode = useCallback(
    (next: VersioningCapabilities.ReviewMode) => update((prev) => ({ ...prev, mode: next })),
    [update],
  );

  const history = document?.history;
  const activeBranch =
    selection.kind === 'branch'
      ? history?.branches.find((branch) => branch.id === selection.branchId && branch.status === 'active')
      : undefined;
  const activeVersion =
    selection.kind === 'checkpoint'
      ? history?.versions.find((version) => version.id === selection.versionId)
      : undefined;
  // The fork point is read from the parent (never bindable), so a merged/archived branch resolves
  // here too — its anchor heads remain reachable on the parent document.
  const activeFork =
    selection.kind === 'fork' ? history?.branches.find((branch) => branch.id === selection.branchId) : undefined;

  // The branch a checkpoint was taken on, but only while it is still ACTIVE (bindable): once a branch
  // is merged its registry entry is removed, so `db.branch` would throw. The merge folds the branch's
  // history into the parent, so a merged-branch checkpoint's heads become reachable on the root doc
  // (read there instead — see `checkpointText`).
  const checkpointBranch = activeVersion?.branch
    ? history?.branches.find((branch) => branch.key === activeVersion.branch && branch.status === 'active')
    : undefined;

  // The core branch whose document backs the current view: the selected branch, or — when viewing a
  // branch checkpoint on an active branch — the branch that checkpoint was taken on (its heads live
  // in the branch doc).
  const boundBranch = (activeBranch && Branch.isCore(activeBranch) ? activeBranch : undefined) ?? checkpointBranch;

  // Core branches bind per-surface: the binding's reads/writes land on the branch document only,
  // independent of other surfaces and of the device-global selection.
  const [branchBinding, setBranchBinding] = useState<Database.BranchBinding<Text.Text> | undefined>(undefined);
  useEffect(() => {
    if (!document || !boundBranch) {
      return;
    }
    let disposed = false;
    let binding: Database.BranchBinding<Text.Text> | undefined;
    Branch.bind(document, boundBranch)
      .then((next) => {
        if (disposed) {
          next.dispose();
          return;
        }
        binding = next;
        setBranchBinding(next);
      })
      .catch((error) => log.catch(error));
    return () => {
      disposed = true;
      binding?.dispose();
      setBranchBinding(undefined);
    };
  }, [document, boundBranch]);

  // Load the legacy branch Text (triggers re-render when the ref resolves).
  useObject(activeBranch?.content);
  const activeText = activeBranch
    ? Branch.isCore(activeBranch)
      ? branchBinding?.object
      : activeBranch.content?.target
    : rootText;

  // The compare/merge base: parent content at the branch anchor.
  useObject(activeBranch?.parent);
  const branchParent = activeBranch?.parent.target;
  const branchBaseContent = useMemo(() => {
    if (!activeBranch || !branchParent) {
      return undefined;
    }
    return Version.contentAt(branchParent, activeBranch.anchor);
  }, [activeBranch, branchParent]);

  // The fork point: parent content at the fork's anchor — the read-only state the branch began from.
  useObject(activeFork?.parent);
  const forkParent = activeFork?.parent.target;
  const forkContent = useMemo(() => {
    if (!activeFork || !forkParent) {
      return undefined;
    }
    return Version.contentAt(forkParent, activeFork.anchor);
  }, [activeFork, forkParent]);

  // A checkpoint on an ACTIVE branch reads/pins against the branch-bound Text (its heads live in the
  // branch document). A base checkpoint — or a checkpoint on a since-merged branch, whose heads the
  // merge folded into the root — resolves against the root target directly.
  useObject(activeVersion?.target);
  const checkpointText = activeVersion
    ? checkpointBranch
      ? branchBinding?.object
      : activeVersion.target.target
    : undefined;
  const checkpointContent = useMemo(() => {
    if (!activeVersion || !checkpointText) {
      return undefined;
    }
    return Version.contentAt(checkpointText, activeVersion.heads);
  }, [activeVersion, checkpointText]);

  // Viewing a checkpoint no longer pins the live Text: the editor renders `checkpointContent` (a
  // detached snapshot read via `contentAt`), so only the editor shows history — the live object and
  // every other surface (sidebar title, tabs, backlinks) are unaffected.

  return {
    document,
    history,
    selection,
    setSelection,
    view,
    setView,
    mode,
    setMode,
    activeBranch,
    activeFork,
    forkContent,
    activeText,
    activeVersion,
    checkpointText,
    checkpointContent,
    branchBaseContent,
  };
};
