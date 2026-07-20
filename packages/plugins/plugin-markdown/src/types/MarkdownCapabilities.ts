//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type EditorView } from '@codemirror/view';
import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { type EditorStateStore } from '@dxos/ui-editor';
import { type EditorViewMode } from '@dxos/ui-editor/types';

import { meta } from '#meta';

import type * as Markdown from './Markdown';
import { type MarkdownExtensionProvider } from './types';

/** Schema for persisted markdown state. */
export const StateSchema = Schema.mutable(
  Schema.Struct({
    viewMode: Schema.Record({ key: Schema.String, value: Schema.String }),
  }),
);

export type MarkdownState = {
  viewMode: Record<string, EditorViewMode>;
};

export type EditorViewEntry = { view: EditorView; documentId: string };

export type EditorViewRegistry = {
  register: (attendableId: string, view: EditorView, documentId: string) => void;
  unregister: (attendableId: string) => void;
  get: (attendableId: string) => EditorViewEntry | undefined;
  /** Look up by document id (the object URI), independent of the attendable-id key used to register. */
  getByDocumentId: (documentId: string) => EditorViewEntry | undefined;
};

export const Settings = Capability.makeSingleton<Atom.Writable<Markdown.Settings>>(
  `${meta.profile.key}.capability.settings`,
);

/** Persisted state atom for view mode per document. */
export const State = Capability.makeSingleton<Atom.Writable<MarkdownState>>(`${meta.profile.key}.capability.state`);

/** Editor state store for cursor positions, scroll state, etc. */
export const EditorState = Capability.makeSingleton<EditorStateStore>(`${meta.profile.key}.capability.editor-state`);

/** Registry of active EditorView instances keyed by attendable ID. */
export const EditorViews = Capability.makeSingleton<EditorViewRegistry>(`${meta.profile.key}.capability.editor-views`);

// TODO(burdon): Move to ./types (external API)?
// Multi capability: each contributing plugin provides one batch (array) of extension providers.
export const ExtensionProvider = Capability.make<MarkdownExtensionProvider[]>(
  `${meta.profile.key}.capability.extensions`,
);
