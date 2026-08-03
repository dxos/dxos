//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type EditorView } from '@codemirror/view';
import { type Atom } from '@effect-atom/atom';

import { Capability } from '@dxos/app-framework';
import { type ViewModeItem } from '@dxos/react-ui-editor';
import { type EditorStateStore } from '@dxos/ui-editor';

import { meta } from '#meta';

import type * as Markdown from './Markdown';
import { type MarkdownExtensionProvider, type ReviewMode, type UseEditorBinding } from './types';

export type EditorViewEntry = { view: EditorView; documentId: string };

export type EditorViewRegistry = {
  register: (attendableId: string, view: EditorView, documentId: string) => void;
  unregister: (attendableId: string) => void;
  get: (attendableId: string) => EditorViewEntry | undefined;
  /** Look up by document id (the object URI), independent of the attendable-id key used to register. */
  getByDocumentId: (documentId: string) => EditorViewEntry | undefined;
};

export const Settings = Capability.make<Atom.Writable<Markdown.Settings>>(`${meta.profile.key}.capability.settings`);

/** Editor state store for cursor positions, scroll state, etc. */
export const EditorState = Capability.make<EditorStateStore>(`${meta.profile.key}.capability.editor-state`);

/** Registry of active EditorView instances keyed by attendable ID. */
export const EditorViews = Capability.make<EditorViewRegistry>(`${meta.profile.key}.capability.editor-views`);

// TODO(burdon): Move to ./types (external API)?
export const ExtensionProvider = Capability.make<MarkdownExtensionProvider[]>(
  `${meta.profile.key}.capability.extensions`,
);

/**
 * Hook-shaped contribution computing the editor's subject binding and review affordances (see
 * {@link UseEditorBinding}). Absent, the article binds the object directly with no review
 * affordances. Contributions are app-lifetime: replacing the hook remounts the article (scroll and
 * selection reset), so contributors must register once at activation, not per render.
 */
export const EditorBindingHook = Capability.make<UseEditorBinding>(`${meta.profile.key}.capability.editor-binding`);

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

export const ViewModeExtension = Capability.make<ViewModeExtension>(
  `${meta.profile.key}.capability.view-mode-extension`,
);
