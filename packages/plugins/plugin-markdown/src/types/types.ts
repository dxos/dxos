//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  GraphSerializerProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { type SchemaProvides } from '@dxos/plugin-space';
import { type SpaceInitProvides } from '@dxos/plugin-space';
import { type Extension, type EditorInputMode, type EditorViewMode } from '@dxos/react-ui-editor';

import { type DocumentType } from './document';
import { MARKDOWN_PLUGIN } from '../meta';

const MARKDOWN_ACTION = `${MARKDOWN_PLUGIN}/action`;

export enum MarkdownAction {
  CREATE = `${MARKDOWN_ACTION}/create`,
  SET_VIEW_MODE = `${MARKDOWN_ACTION}/set-view-mode`,
}

export type MarkdownProperties = Record<string, any>;

// TODO(burdon): Async.
export type MarkdownExtensionProvider = (props: { document?: DocumentType }) => Extension | undefined;

export type OnChange = (text: string) => void;

export type MarkdownExtensionProvides = {
  // TODO(burdon): Rename.
  markdown: {
    extensions: MarkdownExtensionProvider;
  };
};

// TODO(wittjosiah): Factor out to graph plugin?
type StackProvides = {
  stack: {
    creators?: Record<string, any>[];
  };
};

export type MarkdownPluginState = {
  // Codemirror extensions provided by other plugins.
  extensionProviders?: MarkdownExtensionProvider[];

  // TODO(burdon): Extend view mode per document to include scroll position, etc.
  // View mode per document.
  viewMode: Record<string, EditorViewMode>;
};

export type MarkdownSettingsProps = {
  defaultViewMode: EditorViewMode;
  editorInputMode?: EditorInputMode;
  experimental?: boolean;
  debug?: boolean;
  toolbar?: boolean;
  typewriter?: string;
  // TODO(burdon): Per document settings.
  numberedHeadings?: boolean;
  folding?: boolean;
};

// TODO(Zan): Move this to the plugin-space plugin or another common location when we implement comments in sheets.
type ThreadProvides<T> = {
  thread: {
    predicate: (obj: any) => obj is T;
    createSort: (obj: T) => (anchorA: string | undefined, anchorB: string | undefined) => number;
  };
};

export type MarkdownPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  GraphSerializerProvides &
  MetadataRecordsProvides &
  SettingsProvides<MarkdownSettingsProps> &
  TranslationsProvides &
  SchemaProvides &
  SpaceInitProvides &
  StackProvides &
  ThreadProvides<DocumentType>;
