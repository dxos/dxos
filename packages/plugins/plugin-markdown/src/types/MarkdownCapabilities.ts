//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Extension } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';
import { type Atom } from '@effect-atom/atom';
import { type ReactNode } from 'react';

import * as Capability from '@dxos/app-framework/Capability';
import { type ViewModeItem } from '@dxos/react-ui-editor';
import { type Text } from '@dxos/schema';
import { type EditorStateStore } from '@dxos/ui-editor';
import { type EditorViewMode } from '@dxos/ui-editor/types';

import { meta } from '#meta';

import type * as Markdown from './Markdown';

export type EditorViewEntry = { view: EditorView; documentId: string };

export type EditorViewRegistry = {
  register: (attendableId: string, view: EditorView, documentId: string) => void;
  unregister: (attendableId: string) => void;
  get: (attendableId: string) => EditorViewEntry | undefined;
  /** Look up by document id (the object URI), independent of the attendable-id key used to register. */
  getByDocumentId: (documentId: string) => EditorViewEntry | undefined;
};

export const Settings = Capability.makeSingleton<Atom.Writable<Markdown.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/** Editor state store for cursor positions, scroll state, etc. */
export const EditorState = Capability.makeSingleton<EditorStateStore>()(`${meta.profile.key}.capability.editorState`);

/** Registry of active EditorView instances keyed by attendable ID. */
export const EditorViews = Capability.makeSingleton<EditorViewRegistry>()(`${meta.profile.key}.capability.editorViews`);

// TODO(burdon): Move to ./types (external API)?
// Multi capability: each contributing plugin provides one batch (array) of extension providers.
export const ExtensionProvider = Capability.make<MarkdownExtensionProvider[]>()(
  `${meta.profile.key}.capability.extensions`,
);

/**
 * Hook-shaped contribution computing the editor's subject binding and review affordances (see
 * {@link UseEditorBinding}). Absent, the article binds the object directly with no review
 * affordances. Contributions are app-lifetime: replacing the hook remounts the article (scroll and
 * selection reset), so contributors must register once at activation, not per render.
 */
export const EditorBindingHook = Capability.make<UseEditorBinding>()(`${meta.profile.key}.capability.editorBinding`);

/**
 * A contributed entry for the editor's view-mode dropdown: surfaces a per-document review mode (e.g.
 * "Suggesting") as a view-mode option beside the built-in preview/source/readonly. Selecting it sets
 * the document's review mode to {@link reviewMode}; it is checked when that mode is active. Contributed
 * by plugin-review (which owns the suggestion/review feature) and consumed by the markdown toolbar,
 * so the option appears only when that plugin is present.
 */
export type ViewModeExtension = {
  /** Stable id, unique across contributions (e.g. `'suggesting'`). */
  id: string;
  icon: string;
  label: ViewModeItem['label'];
  /** The per-document review mode this entry activates and is checked against. */
  reviewMode: ReviewMode;
  /** Sort order among view-mode entries (the built-in modes occupy 0..2). */
  order?: number;
};

export const ViewModeExtension = Capability.make<ViewModeExtension>()(
  `${meta.profile.key}.capability.viewModeExtension`,
);

/** Per-document editing posture (Google-Docs-style); the review semantics are owned by contributors. */
export type ReviewMode = 'editing' | 'suggesting' | 'viewing';

export type MarkdownExtensionProvider = (props: {
  document?: Markdown.Document;
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
  object: Markdown.Document | Text.Text;
  /** Stable surface id; snapshot binding keys derive from it. */
  id: string;
  viewMode?: EditorViewMode;
  /** Applies a built-in view-mode change; the binding drives it from {@link EditorBinding.selectViewMode}. */
  onViewModeChange?: (mode: EditorViewMode) => void;
  /** The `Settings.diffView` value; semantics are owned by the contributor. */
  diffView?: 'inline' | 'sideBySide' | 'gutter' | 'suggest';
};

/**
 * What the editor binds to and the review affordances that ride along, computed per render by a
 * contributed {@link UseEditorBinding} hook (versioning) or the built-in default (bind the object).
 */
export type EditorBinding = {
  /** The subject the editor binds to: the object itself, a substitute Text, or a read-only snapshot stand-in. */
  subject: Markdown.Document | Text.Text | { id: string; text: string };
  initialValue?: string;
  /** Remount key: must change exactly when the bound document changes (an automerge rebind loses scroll/selection). */
  key: string;
  /** Overrides the requested view mode (e.g. forces `readonly` for snapshots). */
  viewMode?: EditorViewMode;
  /** True while a binding resolves; the editor must not mount (edits could land on the wrong document). */
  loading: boolean;
  /** True when no explicit version/branch is selected — gates the review-mode entries in the view-mode dropdown. */
  ambient: boolean;
  /**
   * One entry point for the view-mode dropdown: a built-in editor mode or a contributed review mode.
   * The binding owns what a selection means — both the review posture and the editor view mode are
   * decided together, so the two can never be stored in contradiction (a stale readonly view mode
   * surviving into Suggesting was exactly that bug).
   */
  selectViewMode: (selection: ViewModeSelection) => void;
  /** The contributed entry currently active (checked in the dropdown); undefined ⇒ a built-in is active. */
  activeReviewMode?: ReviewMode;
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
/** A view-mode dropdown selection, forwarded verbatim to {@link EditorBinding.selectViewMode}. */
export type ViewModeSelection =
  | { kind: 'builtin'; viewMode: EditorViewMode }
  | { kind: 'contributed'; reviewMode: ReviewMode };

export type UseEditorBinding = (props: EditorBindingProps) => EditorBinding;
