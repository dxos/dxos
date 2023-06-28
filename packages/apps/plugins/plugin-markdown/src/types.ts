//
// Copyright 2023 DXOS.org
//

import { MarkdownComposerProps } from '@dxos/aurora-composer';

export type MarkdownProperties = {
  title: string;
  meta?: { keys?: { source?: string; id?: string }[] };
  readOnly?: boolean;
};

export type MarkdownProvides = {
  markdown: {
    onChange: MarkdownComposerProps['onChange'];
  };
};
