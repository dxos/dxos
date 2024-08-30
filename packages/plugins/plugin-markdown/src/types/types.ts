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
import { type SchemaProvides } from '@dxos/plugin-client';
import { type Extension, type EditorInputMode, type EditorViewMode } from '@dxos/react-ui-editor';

import { type DocumentType } from './document';
import { MARKDOWN_PLUGIN } from '../meta';

const MARKDOWN_ACTION = `${MARKDOWN_PLUGIN}/action`;

export enum MarkdownAction {
  CREATE = `${MARKDOWN_ACTION}/create`,
  SET_VIEW_MODE = `${MARKDOWN_ACTION}/set-view-mode`,
}

// TODO(burdon): Remove?
export type MarkdownProperties = Record<string, any>;

export type ExtensionsProvider = (props: { document?: DocumentType }) => Extension[];
export type OnChange = (text: string) => void;

export type MarkdownExtensionProvides = {
  markdown: {
    extensions: ExtensionsProvider;
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
  extensionProviders: NonNullable<ExtensionsProvider>[];

  // TODO(burdon): Extend view mode per document to include scroll position, etc.
  // View mode per document.
  viewMode: { [key: string]: EditorViewMode };
};

export type MarkdownSettingsProps = {
  defaultViewMode: EditorViewMode;
  editorInputMode?: EditorInputMode;
  experimental?: boolean;
  debug?: boolean;
  toolbar?: boolean;
  typewriter?: string;
};

export type MarkdownPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  GraphSerializerProvides &
  MetadataRecordsProvides &
  SettingsProvides<MarkdownSettingsProps> &
  TranslationsProvides &
  SchemaProvides &
  StackProvides;
