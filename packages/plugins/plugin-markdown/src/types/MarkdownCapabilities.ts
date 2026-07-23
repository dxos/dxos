//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type EditorView } from '@codemirror/view';
import { type Atom } from '@effect-atom/atom-react';
import { type ComponentType } from 'react';

import { Capability } from '@dxos/app-framework';
import { type EditorStateStore, type SuggestionSource } from '@dxos/ui-editor';

import { meta } from '#meta';

import type * as Markdown from './Markdown';
import { type MarkdownExtensionProvider } from './types';

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

export type SuggestionSourcesProviderProps = {
  /** The versioned document whose active `kind:'suggestion'` branches are enumerated. */
  document?: Markdown.Document;
  /** Author palette hues keyed by DID, forwarded so each source keeps its author's colour. */
  authorHues?: Record<string, string>;
  /** Emits the aggregated per-author suggestion sources whenever the resolved set changes. */
  onSources: (sources: SuggestionSource[]) => void;
};

/**
 * Slot for a headless component that enumerates a document's active suggestion branches and emits
 * their aggregated {@link SuggestionSource}s for the ambient review overlay. Contributed by
 * plugin-comments (which owns branch resolution) and consumed here — the inverted dependency
 * (comments → markdown) is bridged through this capability rather than a direct import.
 */
export const SuggestionSourcesProvider = Capability.make<ComponentType<SuggestionSourcesProviderProps>>(
  `${meta.profile.key}.capability.suggestion-sources-provider`,
);
