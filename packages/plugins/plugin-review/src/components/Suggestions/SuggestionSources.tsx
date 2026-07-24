//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useCallback, useEffect, useState } from 'react';

import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import { isNonNullable } from '@dxos/util';
import { Branch } from '@dxos/versioning';

import { type ResolvedSuggestionBranch } from '../../hooks';

type VersionedObject = Parameters<typeof Branch.bind>[0];
type BranchRecord = Parameters<typeof Branch.bind>[1];

export type SuggestionSourcesProps = {
  /** The versioned document whose `kind:'suggestion'` branches are enumerated. */
  document?: VersionedObject;
  /** Author palette hues keyed by DID; attached to each resolved branch so it survives to callers. */
  authorHues?: Record<string, string>;
  /**
   * Called with the resolved suggestion branches whenever the enumerated set or their content
   * changes. Fires post-commit (`useEffect`), so on a `document` swap it lags one frame behind the
   * new document's `resolved` set. Kept for the editor's ambient overlay, which binds into a
   * CodeMirror extension and cannot consume a render-prop.
   */
  onResolved?: (resolved: ResolvedSuggestionBranch[]) => void;
  /**
   * Render-prop called synchronously in this component's own render with the `resolved` set derived
   * from the CURRENT `document` — unlike `onResolved`, a `document` swap can never paint a stale
   * frame from the previous document. Prefer this for consumers that render (e.g. the review
   * companion); both may be provided at once.
   */
  children?: (resolved: ResolvedSuggestionBranch[]) => ReactNode;
};

/**
 * Headless enumerator for a document's active `kind:'suggestion'` branches: binds each to its live
 * content (via {@link BranchContent}) and reports the resolved set both synchronously (render-prop
 * `children`) and post-commit (`onResolved`). Renders only invisible probes plus whatever `children`
 * returns — shared by the review companion ({@link Suggestions}) and the editor's ambient overlay so
 * both read the same resolved sources.
 */
export const SuggestionSources = ({ document, authorHues, onResolved, children }: SuggestionSourcesProps) => {
  // Re-run when branches are added/removed/archived.
  useObject(document, 'history');
  const branches = (document?.history?.branches ?? []).filter(
    (branch) => branch.status === 'active' && branch.kind === 'suggestion',
  );

  // Current content per branch, kept live by the per-branch probes below.
  const [contents, setContents] = useState<Record<string, ResolvedSuggestionBranch>>({});
  const setContent = useCallback((id: string, value: ResolvedSuggestionBranch) => {
    setContents((current) =>
      current[id]?.content === value.content && current[id]?.author === value.author && current[id]?.hue === value.hue
        ? current
        : { ...current, [id]: value },
    );
  }, []);

  // Drop stale per-branch entries on a document swap so a lingering id can never leak content from
  // the previous document into the new document's resolved set.
  useEffect(() => {
    setContents({});
  }, [document]);

  const resolved = branches.map((branch) => contents[branch.id]).filter(isNonNullable);

  useEffect(() => {
    onResolved?.(resolved);
    // `JSON.stringify` dep re-fires only when the resolved content actually changes (`resolved` is a
    // fresh array each render, so a reference-equality dep would fire on every parent re-render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onResolved, JSON.stringify(resolved)]);

  return (
    <>
      {document &&
        branches.map((branch) => (
          <BranchContent
            key={branch.id}
            document={document}
            branch={branch}
            hue={authorHues?.[branch.creator ?? branch.id]}
            onContent={setContent}
          />
        ))}
      {children?.(resolved)}
    </>
  );
};

SuggestionSources.displayName = 'SuggestionSources';

/**
 * Binds a single suggestion branch and reports its content up, re-emitting reactively as the branch
 * is edited. Renders nothing — one instance per active suggestion branch keeps the resolved set live
 * without a fixed number of hooks.
 */
const BranchContent = ({
  document,
  branch,
  hue,
  onContent,
}: {
  document: VersionedObject;
  branch: BranchRecord;
  hue?: string;
  onContent: (id: string, value: ResolvedSuggestionBranch) => void;
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
      onContent(branch.id, { author: branch.creator ?? branch.id, content, hue });
    }
  }, [content, branch.id, branch.creator, hue, onContent]);

  return null;
};
