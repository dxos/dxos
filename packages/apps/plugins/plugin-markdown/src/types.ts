//
// Copyright 2023 DXOS.org
//

import type { Document } from '@braneframe/types';
import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import type { ObjectMeta } from '@dxos/react-client/echo';
import type { EditorMode } from '@dxos/react-ui-editor';

import { MARKDOWN_PLUGIN } from './meta';

const MARKDOWN_ACTION = `${MARKDOWN_PLUGIN}/action`;

export enum MarkdownAction {
  CREATE = `${MARKDOWN_ACTION}/create`,
}

export type MarkdownProperties = {
  title: string;

  // TODO(burdon): Since this is always very precisely an ECHO object why obfuscate it?
  __meta: ObjectMeta;
  readOnly?: boolean;
};

export type MarkdownProvides = {
  markdown: {
    filter?: (document: Document) => boolean;
    onChange?: (text: string) => void;
  };
};

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[DocumentType.name] = DocumentType;

// TODO(wittjosiah): Factor out to graph plugin?
type StackProvides = {
  stack: {
    creators?: Record<string, any>[];
  };
};

export type MarkdownSettingsProps = {
  editorMode?: EditorMode;
  showWidgets?: boolean; // TODO(burdon): Flip.
};

export type MarkdownPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  StackProvides & {
    settings: MarkdownSettingsProps;
  };
