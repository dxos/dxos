//
// Copyright 2026 DXOS.org
//

import { Compartment, type Extension } from '@codemirror/state';
import React, { useEffect, useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { useIdentity } from '@dxos/halo-react';
import { Markdown, type UseEditorBinding } from '@dxos/plugin-markdown/types';
import { useEditorContext } from '@dxos/react-ui-editor';
import { Text } from '@dxos/schema';
import { type SuggestionSource, type suggestionsOverlay } from '@dxos/ui-editor';

import { SuggestionSourcesProvider } from '../components';
import { useReviewExtensions } from './useReviewExtensions';
import { useVersionedEditor } from './useVersionedEditor';
import { useVersioning } from './useVersioning';
import { VersionToolbar } from './VersionToolbar';

// The compare/diff overlay is swapped in and out through a compartment so toggling Compare
// reconfigures the live editor rather than remounting it (which would rebind automerge and lose
// scroll/selection). The branch binding is unchanged while comparing, so only the overlay moves.
const compareCompartment = new Compartment();

/**
 * The versioning implementation of markdown's editor-binding contract: version selection swaps the
 * editor's subject (branch binding, checkpoint/fork snapshot, Ambient Suggesting own-branch), and
 * the review affordances (suggest overlay, tracked changes, multi-author ambient overlay, compare
 * overlay, version banner) ride along. Contributed via `MarkdownCapabilities.EditorBindingHook`.
 */
export const useMarkdownEditorBinding: UseEditorBinding = ({ object, id, viewMode, diffView }) => {
  const identity = useIdentity();
  const versioning = useVersioning(object);
  // The accepted base (`main`) the review overlays diff against; subscribed so it tracks keystrokes.
  const [docContent] = useObject(Obj.instanceOf(Markdown.Document, object) ? object.content : undefined, 'content');
  const [textContent] = useObject(Obj.instanceOf(Text.Text, object) ? object : undefined, 'content');
  const mainContent = docContent ?? textContent;

  const editor = useVersionedEditor({ object, versioning, identity, mainContent, diffView, viewMode, id });
  const review = useReviewExtensions({ object, versioning, editor, identity, mainContent, diffView });

  // The compartment placeholder and the ambient overlay's base extension are baked into the mount;
  // both are reconfigured live through the overlay components below, never by remounting.
  const extensions = useMemo<Extension[]>(
    () => [compareCompartment.of([]), review.overlay.extension, ...review.reviewExtensions],
    [review.overlay, review.reviewExtensions],
  );

  const { document } = versioning;
  const { ambient, policy } = editor;

  const overlays = (
    <>
      <CompareOverlay overlay={review.compareOverlay} />
      {/* Ambient review: enumerate every author's suggestion branches (invisible bridge) and
          overlay them live; both are no-ops off the ambient path or when no provider exists. */}
      {ambient && document && (
        <SuggestionSourcesProvider
          document={document}
          authorHues={review.authorHues}
          onSources={review.setSuggestionSources}
        />
      )}
      <SuggestionsOverlay
        overlay={review.overlay}
        sources={review.overlaySources}
        base={review.overlayBase}
        enabled={ambient && policy.showSuggestions}
      />
    </>
  );

  return {
    subject: editor.editorObject,
    initialValue: editor.initialValue,
    key: editor.editorKey,
    viewMode: editor.effectiveViewMode,
    loading: editor.branchLoading,
    ambient,
    reviewMode: versioning.mode,
    setReviewMode: versioning.setMode,
    extensionProps: {
      reviewBranch: editor.reviewBranch,
      // Only when the editor is bound to the branch doc directly (Branch view) — in the
      // diff/suggest overlay the editor stays on main, so anchors resolve against main.
      branchText: editor.suggestActive ? undefined : editor.branchText,
      suggestionBranch: editor.suggestionBranch,
      // Ambient view follows the review policy; the advanced paths always show comments.
      showComments: ambient ? policy.showComments : true,
    },
    extensions,
    overlays,
    banner: <VersionToolbar versioning={versioning} />,
  };
};

/**
 * Reconfigures the compare/diff overlay on the live editor when Compare is toggled, avoiding a
 * remount. Must render inside `Editor.Root`.
 */
const CompareOverlay = ({ overlay }: { overlay?: Extension }) => {
  const { controller } = useEditorContext('MarkdownEditorBinding.CompareOverlay');
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
  const { controller } = useEditorContext('MarkdownEditorBinding.SuggestionsOverlay');
  const view = controller?.view;
  useEffect(() => {
    if (view) {
      overlay.reconfigure(view, sources, enabled, base);
    }
  }, [view, overlay, sources, enabled, base]);

  return null;
};
