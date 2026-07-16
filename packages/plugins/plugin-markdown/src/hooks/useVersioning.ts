//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { useAtomCapabilityState } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/react-client/echo';
import { type Text } from '@dxos/schema';

import { contentAt } from '../model';
import { Markdown, MarkdownCapabilities, type Versioning } from '../types';

export type UseVersioningResult = {
  document?: Markdown.Document;
  history?: Versioning.History;
  selection: MarkdownCapabilities.VersionSelection;
  setSelection: (selection: MarkdownCapabilities.VersionSelection) => void;
  compare: boolean;
  setCompare: (compare: boolean) => void;
  /** The branch being viewed (selection.kind === 'branch'). */
  activeBranch?: Versioning.Branch;
  /** The Text object the editor should bind to (branch Text or the root). */
  activeText?: Text.Text;
  /** The checkpoint being viewed (selection.kind === 'checkpoint'). */
  activeVersion?: Versioning.Version;
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

  // Load the branch Text (triggers re-render when the ref resolves).
  useObject(activeBranch?.content);
  const activeText = activeBranch?.content.target ?? rootText;

  // The compare/merge base: parent content at the branch anchor.
  useObject(activeBranch?.parent);
  const branchParent = activeBranch?.parent.target;
  const branchBaseContent = useMemo(() => {
    if (!activeBranch || !branchParent) {
      return undefined;
    }
    return contentAt(branchParent, activeBranch.anchor);
  }, [activeBranch, branchParent]);

  const versionTarget = activeVersion?.target.target;
  useObject(activeVersion?.target);
  const checkpointContent = useMemo(() => {
    if (!activeVersion || !versionTarget) {
      return undefined;
    }
    return contentAt(versionTarget, activeVersion.heads);
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
