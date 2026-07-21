//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useOptionalAtomCapabilityState } from '@dxos/app-framework/ui';
import { type Database, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { SpaceCapabilities } from '@dxos/plugin-space';
import { type Text } from '@dxos/schema';
import { Branch, History, Version } from '@dxos/versioning';

import { Markdown } from '../types';

export type UseVersioningResult = {
  document?: Markdown.Document;
  history?: History.History;
  selection: SpaceCapabilities.VersionSelection;
  setSelection: (selection: SpaceCapabilities.VersionSelection) => void;
  /** Active branch view (base parent / diff overlay / branch draft); only meaningful with a branch selected. */
  view: SpaceCapabilities.BranchView;
  setView: (view: SpaceCapabilities.BranchView) => void;
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
  // Versioning state is contributed by plugin-space (the generic history companion). A markdown
  // editor can render standalone without it (e.g. plugin-blogger, cards, previews), so read it
  // tolerantly: absent → no selection, and the version UI simply does not engage.
  const [state, setState] = useOptionalAtomCapabilityState(SpaceCapabilities.VersioningState);

  // Subscribe to history mutations (checkpoints/branches added elsewhere).
  useObject(document, 'history');
  const [rootText] = [document?.content.target];
  useObject(document?.content);

  const documentId = document?.id;
  const selection = (documentId && state?.selection[documentId]) || { kind: 'current' as const };
  const view = (documentId && state?.view[documentId]) || 'branch';

  const setSelection = useCallback(
    (next: SpaceCapabilities.VersionSelection) => {
      if (!documentId) {
        return;
      }
      setState((current) => ({ ...current, selection: { ...current.selection, [documentId]: next } }));
    },
    [documentId, setState],
  );

  const setView = useCallback(
    (next: SpaceCapabilities.BranchView) => {
      if (!documentId) {
        return;
      }
      setState((current) => ({ ...current, view: { ...current.view, [documentId]: next } }));
    },
    [documentId, setState],
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
