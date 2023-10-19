//
// Copyright 2023 DXOS.org
//

import type { GraphProvides } from '@braneframe/plugin-graph';
import type { IntentProvides } from '@braneframe/plugin-intent';
import type { TranslationsProvides } from '@braneframe/plugin-theme';
import { type Document } from '@braneframe/types';
import { type EditorMode, type MarkdownComposerProps } from '@dxos/react-ui-composer';
import { type ObjectMeta } from '@dxos/client/echo';

export const MARKDOWN_PLUGIN = 'dxos.org/plugin/markdown';

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
    onChange?: MarkdownComposerProps['onChange'];
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

export type MarkdownPluginProvides = GraphProvides &
  IntentProvides &
  TranslationsProvides &
  StackProvides & {
    settings: MarkdownSettingsProps;
  };
