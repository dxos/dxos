//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import { type Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { useObject } from '@dxos/react-client/echo';
import { type Text } from '@dxos/schema';
import { Branch, History, Version } from '@dxos/versioning';

import { Markdown, MarkdownCapabilities } from '../types';

export type UseVersioningResult = {
  document?: Markdown.Document;
  history?: History.History;
  selection: MarkdownCapabilities.VersionSelection;
  setSelection: (selection: MarkdownCapabilities.VersionSelection) => void;
  compare: boolean;
  setCompare: (compare: boolean) => void;
  /** The branch being viewed (selection.kind === 'branch'). */
  activeBranch?: Branch.Branch;
  /**
   * The Text object the editor should bind to: a per-surface branch binding for core branches,
   * the legacy branch Text for content-copy branches, or the root (pinned to the checkpoint's
   * heads while a checkpoint is selected).
   */
  activeText?: Text.Text;
  /** The checkpoint being viewed (selection.kind === 'checkpoint'). */
  activeVersion?: Version.Version;
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
  const [state, setState] = useAtomCapabilityState(MarkdownCapabilities.VersioningState);

  // Subscribe to history mutations (checkpoints/branches added elsewhere).
  useObject(document, 'history');
  const [rootText] = [document?.content.target];
  useObject(document?.content);

  const documentId = document?.id;
  const selection = (documentId && state.selection[documentId]) || { kind: 'current' as const };
  const compare = (documentId && state.compare[documentId]) || false;

  const setSelection = useCallback(
    (next: MarkdownCapabilities.VersionSelection) => {
      if (!documentId) {
        return;
      }
      setState((current) => ({ ...current, selection: { ...current.selection, [documentId]: next } }));
    },
    [documentId, setState],
  );

  const setCompare = useCallback(
    (next: boolean) => {
      if (!documentId) {
        return;
      }
      setState((current) => ({ ...current, compare: { ...current.compare, [documentId]: next } }));
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

  // Core branches bind per-surface: the binding's reads/writes land on the branch document only,
  // independent of other surfaces and of the device-global selection.
  const [branchBinding, setBranchBinding] = useState<Database.BranchBinding<Text.Text> | undefined>(undefined);
  useEffect(() => {
    if (!document || !activeBranch || !Branch.isCore(activeBranch)) {
      return;
    }
    let disposed = false;
    let binding: Database.BranchBinding<Text.Text> | undefined;
    Branch.bind(document, activeBranch)
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
  }, [document, activeBranch]);

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

  const versionTarget = activeVersion?.target.target;
  useObject(activeVersion?.target);
  const checkpointContent = useMemo(() => {
    if (!activeVersion || !versionTarget) {
      return undefined;
    }
    return Version.contentAt(versionTarget, activeVersion.heads);
  }, [activeVersion, versionTarget]);

  // Viewing a checkpoint pins the live Text to the checkpoint's heads: every read on the object
  // (editor text, label) resolves the historical value and writes throw until the pin clears.
  useEffect(() => {
    if (!activeVersion || !versionTarget) {
      return;
    }
    Version.view(activeVersion);
    return () => {
      Version.clearView(activeVersion);
    };
  }, [activeVersion, versionTarget]);

  return {
    document,
    history,
    selection,
    setSelection,
    compare,
    setCompare,
    activeBranch,
    activeText,
    activeVersion,
    checkpointContent,
    branchBaseContent,
  };
};
