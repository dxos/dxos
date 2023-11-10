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
import type { EditorMode, MarkdownEditorProps } from '@dxos/react-ui-editor';

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
    onChange?: MarkdownEditorProps['onChange'];
  };
};

// TODO(wittjosiah): This ensures that typed objects are not proxied by deepsignal. Remove.
// https://github.com/luisherranz/deepsignal/issues/36
(globalThis as any)[DocumentType.name] = DocumentType;

// TODO(burdon): Hack to avoid circular dependency (stack stories depend on markdown plugin).
// TODO(burdon): Review with @thure.
// TODO(wittjosiah): Factor out to graph plugin?
type StackProvides = {
  stack: {
    creators?: Record<string, any>[];
    choosers?: Record<string, any>[];
  };
};

export type MarkdownSettingsProps = { editorMode?: EditorMode };

export type MarkdownPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  StackProvides & {
    settings: MarkdownSettingsProps;
  };
