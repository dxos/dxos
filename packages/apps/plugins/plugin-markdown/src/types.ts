//
// Copyright 2023 DXOS.org
//

import { GraphProvides } from '@braneframe/plugin-graph';
import { IntentProvides } from '@braneframe/plugin-intent';
import { TranslationsProvides } from '@braneframe/plugin-theme';
import { Document } from '@braneframe/types';
import { MarkdownComposerProps } from '@dxos/aurora-composer';

export const MARKDOWN_PLUGIN = 'dxos.org/plugin/markdown';

const MARKDOWN_ACTION = `${MARKDOWN_PLUGIN}/action`;

export enum MarkdownAction {
  CREATE = `${MARKDOWN_ACTION}/create`,
}

export type MarkdownProperties = {
  title: string;
  // TODO(burdon): Factor out (type system).
  meta?: { keys?: { source?: string; id?: string }[] };
  readOnly?: boolean;
};

export type MarkdownProvides = {
  markdown: {
    onChange?: MarkdownComposerProps['onChange'];
    filter?: (document: Document) => boolean;
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

export type MarkdownPluginProvides = GraphProvides & IntentProvides & TranslationsProvides & StackProvides;
