//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useCallback, useMemo, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import * as CollaborationOperation from '@dxos/app-toolkit/CollaborationOperation';
import { Obj } from '@dxos/echo';
import { toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { type Identity } from '@dxos/halo';
import { useMembers } from '@dxos/halo-react';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import { getSpace } from '@dxos/react-client/echo';
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { Text } from '@dxos/schema';
import {
  type DiffHunk,
  type SuggestionSource,
  diffView,
  suggestChanges,
  suggestionsOverlay,
  trackChanges,
} from '@dxos/ui-editor';
import { Branch } from '@dxos/versioning';

import { versionDiff } from '../extensions';
import * as ReviewCapabilities from '../types/ReviewCapabilities';
import { authorHue, hueColour } from '../util';
import { type VersionedEditor } from './useVersionedEditor';
import { type useVersioning } from './useVersioning';

export type ReviewExtensionsProps = {
  object: Markdown.Document | Text.Text;
  versioning: ReturnType<typeof useVersioning>;
  editor: VersionedEditor;
  identity: Identity.Info | null | undefined;
  /** The document's live (main) content — the base the Suggesting overlays diff against. */
  mainContent: string | undefined;
  diffView: Markdown.Settings['diffView'];
};

export type ReviewExtensions = {
  /** Review extensions appended to the editor's base extension list (suggest overlay, own tracked changes). */
  reviewExtensions: Extension[];
  /** The compare/diff overlay, reconfigured live through the compare compartment. */
  compareOverlay: Extension | undefined;
  /** The ambient multi-author suggestion overlay, reconfigured live (never remounts the editor). */
  overlay: ReturnType<typeof suggestionsOverlay>;
  overlaySources: SuggestionSource[];
  overlayBase: string | undefined;
  setSuggestionSources: (sources: SuggestionSource[]) => void;
  /** Author palette hues by creator DID for the ambient provider (matches avatar/banner colours). */
  authorHues: Record<string, string>;
};

/**
 * Review affordances over the versioned editor: routes inline suggestion Accept/Reject through the
 * durable collaboration ops, overlays other authors' suggestion branches, tracks the user's own
 * changes in Suggesting mode, and builds the compare/diff overlay. Concentrates plugin-markdown's
 * dependency on the versioning model for the review concern.
 */
export const useReviewExtensions = ({
  object,
  versioning,
  editor,
  identity,
  mainContent,
  diffView: diffViewSetting,
}: ReviewExtensionsProps): ReviewExtensions => {
  const { document, activeBranch, branchBaseContent } = versioning;
  const { ambientSuggesting, suggestActive, compareActive, branchText, ownBranchText, reviewBranch } = editor;
  const diffViewMode = diffViewSetting ?? 'suggest';

  // Route the inline suggestion Accept/Reject controls through the durable, undoable collaboration
  // ops. The anchor is a cursor range over the parent (main) content — the editor is bound to main
  // in suggest mode — and `branch` is the compare (author) branch key (`reviewBranch`).
  // Optional: every call site already guards `invokePromise?.` — accept/reject are simply inert in
  // hosts without an operation invoker (bare stories, headless scenario tests).
  const invokePromise = useOptionalCapability(Capabilities.OperationInvoker)?.invokePromise;
  const handleAcceptChange = useCallback(
    (hunk: DiffHunk) => {
      const content = Obj.instanceOf(Markdown.Document, object) ? object.content?.target : undefined;
      if (!content || !reviewBranch) {
        return;
      }
      const anchor = toCursorRange(Doc.createAccessor(content, ['content']), hunk.from, hunk.to);
      void invokePromise?.(CollaborationOperation.AcceptChange, { subject: object, anchor, branch: reviewBranch });
    },
    [object, reviewBranch, invokePromise],
  );
  const handleRejectChange = useCallback(
    (hunk: DiffHunk) => {
      const content = Obj.instanceOf(Markdown.Document, object) ? object.content?.target : undefined;
      if (!content || !reviewBranch) {
        return;
      }
      const anchor = toCursorRange(Doc.createAccessor(content, ['content']), hunk.from, hunk.to);
      void invokePromise?.(CollaborationOperation.RejectChange, { subject: object, anchor, branch: reviewBranch });
    },
    [object, reviewBranch, invokePromise],
  );

  // Ambient overlay Accept/Reject: unlike the single-branch compare path (which keys off
  // `reviewBranch`), the aggregated overlay identifies the target branch from the suggestion's
  // author — the branch's creator DID, carried through `buildSuggestionSources`. Resolve it to the
  // core branch key and route the same durable op. No matching core branch ⇒ no-op.
  const resolveAuthorBranch = useCallback(
    (author: string): string | undefined => {
      const branch = document?.history?.branches.find(
        (branch) =>
          branch.status === 'active' &&
          branch.kind === 'suggestion' &&
          (branch.creator ?? branch.id) === author &&
          Branch.isCore(branch),
      );
      return branch?.key;
    },
    [document],
  );
  const handleAmbientAccept = useCallback(
    (hunk: DiffHunk, author: string) => {
      const content = Obj.instanceOf(Markdown.Document, object) ? object.content?.target : undefined;
      const branch = resolveAuthorBranch(author);
      if (!content || !branch) {
        return;
      }
      const anchor = toCursorRange(Doc.createAccessor(content, ['content']), hunk.from, hunk.to);
      void invokePromise?.(CollaborationOperation.AcceptChange, { subject: object, anchor, branch });
    },
    [object, resolveAuthorBranch, invokePromise],
  );
  const handleAmbientReject = useCallback(
    (hunk: DiffHunk, author: string) => {
      const content = Obj.instanceOf(Markdown.Document, object) ? object.content?.target : undefined;
      const branch = resolveAuthorBranch(author);
      if (!content || !branch) {
        return;
      }
      const anchor = toCursorRange(Doc.createAccessor(content, ['content']), hunk.from, hunk.to);
      void invokePromise?.(CollaborationOperation.RejectChange, { subject: object, anchor, branch });
    },
    [object, resolveAuthorBranch, invokePromise],
  );

  // Live-resolved suggestion sources for the ambient overlay, fed by the (invisible) provider
  // bridge in the container; empty until a provider is contributed — the overlay
  // then simply renders nothing.
  const [suggestionSources, setSuggestionSources] = useState<SuggestionSource[]>([]);

  // The ambient multi-author suggestion overlay (shared with the markdown editor via `@dxos/ui-editor`,
  // the leaf both depend on) lives in its own compartment, reconfigured live as the resolved sources
  // or the review mode change — it must never remount the editor (which would rebind automerge and
  // lose scroll/selection).
  // Clicking a change in the document makes it current for every review surface: the companion accents
  // the matching card (see `suggestionGroupKey`).
  const { set: setReviewView } = useViewStateActions(ReviewCapabilities.ReviewCapabilities.viewAspect, object.id);
  const handleSelectSuggestion = useCallback(
    (hunk: DiffHunk, author: string) => {
      setReviewView({ suggestion: { author, from: hunk.from, to: hunk.to } });
    },
    [setReviewView, object.id],
  );
  const overlay = useMemo(
    () => suggestionsOverlay(handleAmbientAccept, handleAmbientReject, handleSelectSuggestion),
    [handleAmbientAccept, handleAmbientReject, handleSelectSuggestion],
  );

  // In Suggesting mode the editor is bound to the user's own branch, so the foreign overlay diffs
  // each source against main (rebased into the document's coordinates) and EXCLUDES the user's own
  // branch — self is shown by `trackChanges`, not doubled here. Off the suggesting path the overlay
  // diffs sources directly against the editor document (which is main). Authors the user has hidden
  // are filtered at the source (never per-decoration), so bars and counts stay consistent.
  const { hiddenAuthors } = useViewState(ReviewCapabilities.ReviewCapabilities.viewAspect, object.id);
  const overlaySources = useMemo(() => {
    const hidden = new Set(hiddenAuthors ?? []);
    return suggestionSources.filter(
      (source) => !hidden.has(source.author) && !(ambientSuggesting && identity?.did && source.author === identity.did),
    );
  }, [ambientSuggesting, identity?.did, suggestionSources, hiddenAuthors]);
  const overlayBase = ambientSuggesting ? mainContent : undefined;

  // The suggestion author's palette colour — the same colour as their banner tag and avatar — so
  // the inline markers attribute the change by colour. Resolved against the space members.
  const members = useMembers(getSpace(object)?.id);
  const suggestColour = useMemo(
    () => (activeBranch ? hueColour(authorHue(activeBranch, members)) : undefined),
    [activeBranch, members],
  );

  // The current user's own suggestion-branch colour for Suggesting mode's tracked changes — the same
  // hue as their avatar/banner, resolved via the shared helper so self reads consistently.
  const ownSuggestionBranch = document?.history?.branches.find(
    (branch) => branch.status === 'active' && branch.kind === 'suggestion' && branch.creator === identity?.did,
  );
  const selfColour = useMemo(
    () => hueColour(ownSuggestionBranch ? authorHue(ownSuggestionBranch, members) : 'neutral'),
    [ownSuggestionBranch?.id, members],
  );

  // Author palette hues for every active suggestion branch, keyed by creator DID — passed to the
  // ambient provider so each author's overlay colour matches their avatar/banner hue (the same
  // helpers as the single-branch path above) instead of falling back to a hash.
  const suggestionAuthorBranches =
    document?.history?.branches.filter((branch) => branch.status === 'active' && branch.kind === 'suggestion') ?? [];
  const authorHuesKey = suggestionAuthorBranches.map((branch) => `${branch.id}:${branch.creator ?? ''}`).join(',');
  const authorHues = useMemo(() => {
    const record: Record<string, string> = {};
    for (const branch of suggestionAuthorBranches) {
      if (branch.creator) {
        // Pass the bare hue name: the ambient overlay resolves it via `suggestionHue` (which matches
        // against the palette names), so a `var(--color-…)` string would never match and fall back to
        // a hash. Matches the form `CommentsArticle` passes.
        record[branch.creator] = authorHue(branch, members);
      }
    }
    return record;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorHuesKey, members]);

  // The user's own tracked-changes layer (Suggesting mode only), isolated in its own memo so that
  // `mainContent` — which changes on EVERY keystroke while editing main — never reaches the combined
  // extensions. Otherwise a new extensions array each keystroke would make `useTextEditor` recreate
  // the view and drop the caret's focus. In Suggesting mode the editor is bound to the branch, so
  // `mainContent` (main) is stable across keystrokes; a merge to main updates the base via
  // `trackChanges`'s `setBase` rather than by recreating the extension.
  const ownTrackChanges = useMemo<Extension | undefined>(
    () =>
      ambientSuggesting && ownBranchText && mainContent !== undefined
        ? trackChanges({ main: mainContent, colour: selfColour })
        : undefined,
    [ambientSuggesting, ownBranchText, mainContent, selfColour],
  );

  // The suggest overlay stays baked into the editor's extension list: it rebinds the editor to the
  // parent and so already remounts via the editor key.
  const reviewExtensions = useMemo<Extension[]>(() => {
    const list: Extension[] = [];
    if (suggestActive && branchText) {
      // Editor is bound to the parent; the branch content is the proposal. Accept cherry-picks the
      // hunk into the parent (AcceptChange); reject reverts it on the author's branch (RejectChange).
      list.push(
        suggestChanges({
          proposal: branchText.content,
          colour: suggestColour,
          onAccept: handleAcceptChange,
          onReject: handleRejectChange,
        }),
      );
    }
    // Foreign authors overlay separately via the compartment overlay (diffed vs main, self excluded),
    // so this own-author layer stays single-author.
    if (ownTrackChanges) {
      list.push(ownTrackChanges);
    }
    return list;
  }, [suggestActive, branchText, suggestColour, handleAcceptChange, handleRejectChange, ownTrackChanges]);

  // Diff overlay over the live (editable) branch editor: the lightweight inline/gutter variants use
  // the custom versionDiff decorations; sideBySide uses the richer editable unified merge overlay
  // (codemirror merge chunks with review-oriented colouring) — the branch stays editable in every
  // mode, so a reviewer can adjust the draft while seeing it diffed against the anchor.
  const compareOverlay = useMemo<Extension | undefined>(() => {
    if (compareActive && branchBaseContent !== undefined && diffViewMode !== 'suggest') {
      return diffViewMode === 'sideBySide'
        ? diffView({ original: branchBaseContent })
        : versionDiff({ base: branchBaseContent, variant: diffViewMode });
    }
    return undefined;
  }, [compareActive, branchBaseContent, diffViewMode]);

  return {
    reviewExtensions,
    compareOverlay,
    overlay,
    overlaySources,
    overlayBase,
    setSuggestionSources,
    authorHues,
  };
};
