//
// Copyright 2023 DXOS.org
//

import * as S from '@effect/schema/Schema';

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import * as E from '@dxos/echo-schema';
import { type ObjectMeta } from '@dxos/react-client/echo';
import { type Extension, type EditorMode } from '@dxos/react-ui-editor';

import { MARKDOWN_PLUGIN } from './meta';

const MARKDOWN_ACTION = `${MARKDOWN_PLUGIN}/action`;

export enum MarkdownAction {
  CREATE = `${MARKDOWN_ACTION}/create`,
  TOGGLE_READONLY = `${MARKDOWN_ACTION}/toggle-readonly`,
}

// TODO(burdon): Remove?
export type MarkdownProperties = {
  title: string;

  // TODO(burdon): Since this is always very precisely an ECHO object why obfuscate it?
  __meta: ObjectMeta;
  readonly?: boolean;
};

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

// TODO(burdon): Extend view mode per document to include scroll position, etc.
type EditorState = {
  readonly?: boolean;
};

export type MarkdownSettingsProps = {
  state: { [key: string]: EditorState };
  editorMode?: EditorMode;
  experimental?: boolean;
  debug?: boolean;
  toolbar?: boolean;
  typewriter?: string;
};

export type MarkdownPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  MetadataRecordsProvides &
  SettingsProvides<MarkdownSettingsProps> &
  TranslationsProvides &
  StackProvides;

const _TextV0Schema = S.struct({
  content: S.string,
}).pipe(E.echoObject('dxos.Text.v0', '0.1.0'));
interface TextV0Type extends E.ObjectType<typeof _TextV0Schema> {}
export const TextV0Schema: S.Schema<TextV0Type> = _TextV0Schema;

const _DocumentSchema = S.struct({
  title: S.optional(S.string),
  content: E.ref(TextV0Schema),
  comments: S.optional(
    S.array(
      S.struct({
        thread: S.optional(E.ref(E.AnyEchoObject)),
        cursor: S.optional(S.string),
      }),
    ),
  ),
}).pipe(E.echoObject('braneframe.Document', '0.1.0'));
export interface DocumentType extends E.ObjectType<typeof _DocumentSchema> {}
export const DocumentSchema: S.Schema<DocumentType> = _DocumentSchema;

export const isDocument = (data: unknown): data is E.EchoReactiveObject<DocumentType> =>
  !!data && E.getSchema<any>(data) === DocumentSchema;
