//
// Copyright 2023 DXOS.org
//

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
    onChange: MarkdownComposerProps['onChange'];
  };
};
