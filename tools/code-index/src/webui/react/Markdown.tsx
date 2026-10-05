//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { MarkdownView } from '@dxos/react-ui-markdown';
import * as Theme from '@dxos/react-ui/Theme';

export type MarkdownIslandProps = {
  readonly content: string;
};

/** Composer's markdown renderer; it skips raw HTML, so model output needs no sanitizer. */
export const MarkdownIsland = ({ content }: MarkdownIslandProps) => (
  <Theme.Provider tx={Theme.defaultTx}>
    <MarkdownView
      content={content}
      classNames='p-2 text-sm [&_table]:my-1 [&_td]:border [&_td]:border-separator [&_td]:px-2 [&_th]:border [&_th]:border-separator [&_th]:px-2 [&_th]:text-left'
    />
  </Theme.Provider>
);
