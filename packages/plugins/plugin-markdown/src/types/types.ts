//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { type ReactNode } from 'react';

import { type Text } from '@dxos/schema';
import { type EditorViewMode } from '@dxos/ui-editor/types';

import { type Document } from './Markdown';

/** Per-document editing posture (Google-Docs-style); the review semantics are owned by contributors. */
export type ReviewMode = 'editing' | 'suggesting' | 'viewing';

export type MarkdownExtensionProvider = (props: {
  document?: Document;
  viewMode?: EditorViewMode;
  /** The core branch the editor is currently showing (the branch under review); undefined = main. */
  reviewBranch?: string;
  /**
   * The branch content Text the editor is bound to when editing a branch directly (Branch view);
   * undefined on main or in the diff/suggest overlay. Anchors (e.g. comment cursors) resolve
   * against it so they match the document the editor produced them from.
   */
  branchText?: Text.Text;
  /** True when the active branch is a per-user suggestion branch (comment creation is prohibited). */
  suggestionBranch?: boolean;
  /**
   * Whether comment affordances should render, per the contributed review policy. Defaults to
   * `true`; a policy override may hide comments
   * (e.g. a distraction-free reading mode) without changing the default Viewing behaviour.
   */
  showComments?: boolean;
}) => Extension | undefined;

export type MarkdownPluginState = {
  /** Codemirror extensions provided by other plugins. */
  extensionProviders?: MarkdownExtensionProvider[];

  /** View mode per document. */
  viewMode: Record<string, EditorViewMode>;
};

/** Inputs the article hands a contributed editor-binding hook. */
export type EditorBindingProps = {
  object: Document | Text.Text;
  /** Stable surface id; snapshot binding keys derive from it. */
  id: string;
  viewMode?: EditorViewMode;
  /** The `Settings.diffView` value; semantics are owned by the contributor. */
  diffView?: 'inline' | 'sideBySide' | 'gutter' | 'suggest';
};

/**
 * What the editor binds to and the review affordances that ride along, computed per render by a
 * contributed {@link UseEditorBinding} hook (versioning) or the built-in default (bind the object).
 */
export type EditorBinding = {
  /** The subject the editor binds to: the object itself, a substitute Text, or a read-only snapshot stand-in. */
  subject: Document | Text.Text | { id: string; text: string };
  initialValue?: string;
  /** Remount key: must change exactly when the bound document changes (an automerge rebind loses scroll/selection). */
  key: string;
  /** Overrides the requested view mode (e.g. forces `readonly` for snapshots). */
  viewMode?: EditorViewMode;
  /** True while a binding resolves; the editor must not mount (edits could land on the wrong document). */
  loading: boolean;
  /** True when no explicit version/branch is selected — gates the review-mode entries in the view-mode dropdown. */
  ambient: boolean;
  reviewMode: ReviewMode;
  setReviewMode: (mode: ReviewMode) => void;
  /** Extra props forwarded to every {@link MarkdownExtensionProvider} call. */
  extensionProps?: Pick<
    Parameters<MarkdownExtensionProvider>[0],
    'reviewBranch' | 'branchText' | 'suggestionBranch' | 'showComments'
  >;
  /** Extensions owned by the binding (review overlays baked into the mount). */
  extensions?: Extension[];
  /** Rendered inside `Editor.Root` (live overlay reconfiguration against the mounted view). */
  overlays?: ReactNode;
  /** Rendered above the editor content (e.g. the version banner strip). */
  banner?: ReactNode;
};

/**
 * Hook-shaped contribution computing the editor binding. At most one is honored; the article calls
 * it through a host component keyed by contribution identity, so hook order stays legal.
 */
export type UseEditorBinding = (props: EditorBindingProps) => EditorBinding;
