//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { type GroupPolicy } from '@dxos/ui-editor';
import { Branch } from '@dxos/versioning';

import { type SuggestionGroup, buildSuggestionSources } from '../../hooks';
import { SuggestionThread } from './SuggestionThread';

type VersionedObject = Parameters<typeof Branch.bind>[0];
type BranchRecord = Parameters<typeof Branch.bind>[1];

export type SuggestionsProps = {
  /** The versioned document whose `kind:'suggestion'` branches are reviewed. */
  document?: VersionedObject;
  /** The base (main) content every suggestion branch is diffed against. */
  base: string;
  group?: GroupPolicy;
  authorLabels?: Record<string, string>;
  onAccept?: (group: SuggestionGroup) => void;
  onReject?: (group: SuggestionGroup) => void;
};

/**
 * Review companion for a document's suggestion branches: enumerates the active `kind:'suggestion'`
 * branches and renders them as change-block tiles (see {@link SuggestionThread}). Each branch's
 * content is tracked reactively (via {@link BranchContent}) so a suggestion appears/updates as its
 * author edits, and disappears when accepted/rejected leaves it empty.
 */
export const Suggestions = ({ document, base, group, authorLabels, onAccept, onReject }: SuggestionsProps) => {
  // Re-run when branches are added/removed/archived.
  useObject(document, 'history');
  const branches = (document?.history?.branches ?? []).filter(
    (branch) => branch.status === 'active' && branch.kind === 'suggestion',
  );

  // Current content per branch, kept live by the per-branch probes below.
  const [contents, setContents] = useState<Record<string, { author: string; content: string }>>({});
  const setContent = useCallback((id: string, value: { author: string; content: string }) => {
    setContents((current) =>
      current[id]?.content === value.content && current[id]?.author === value.author
        ? current
        : { ...current, [id]: value },
    );
  }, []);

  if (!document || branches.length === 0) {
    return null;
  }

  const resolved = branches
    .map((branch) => contents[branch.id])
    .filter((value): value is { author: string; content: string } => value !== undefined);

  return (
    <>
      {branches.map((branch) => (
        <BranchContent key={branch.id} document={document} branch={branch} onContent={setContent} />
      ))}
      <SuggestionThread
        base={base}
        sources={buildSuggestionSources(resolved)}
        group={group}
        authorLabels={authorLabels}
        onAccept={onAccept}
        onReject={onReject}
      />
    </>
  );
};

Suggestions.displayName = 'Suggestions';

/**
 * Binds a single suggestion branch and reports its content up, re-emitting reactively as the branch
 * is edited. Renders nothing — one instance per active suggestion branch keeps the review list live
 * without a fixed number of hooks.
 */
const BranchContent = ({
  document,
  branch,
  onContent,
}: {
  document: VersionedObject;
  branch: BranchRecord;
  onContent: (id: string, value: { author: string; content: string }) => void;
}) => {
  const [binding, setBinding] = useState<Awaited<ReturnType<typeof Branch.bind>> | undefined>(undefined);
  useEffect(() => {
    let disposed = false;
    let bound: Awaited<ReturnType<typeof Branch.bind>> | undefined;
    Branch.bind(document, branch)
      .then((next) => {
        if (disposed) {
          next.dispose();
          return;
        }
        bound = next;
        setBinding(next);
      })
      .catch((error) => log.catch(error));
    return () => {
      disposed = true;
      bound?.dispose();
      setBinding(undefined);
    };
  }, [document, branch.id]);

  // Subscribe to the bound branch text so edits re-emit (the crux — a one-time read would go stale).
  const [content] = useObject(binding?.object, 'content');
  useEffect(() => {
    if (content !== undefined) {
      onContent(branch.id, { author: branch.creator ?? branch.id, content });
    }
  }, [content, branch.id, branch.creator, onContent]);

  return null;
};
