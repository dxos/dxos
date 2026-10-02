//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { MarkdownView, type MarkdownViewProps } from '@dxos/react-ui-markdown';
import type * as Util from '@dxos/react-ui/Util';
import { mx } from '@dxos/ui-theme';

/** A description is a line in a row, not a document: no paragraph block, no heading scale. */
export const DESCRIPTION_COMPONENTS = {
  p: ({ children }: PropsWithChildren) => <span>{children}</span>,
};

export type TaskDescriptionProps = Util.ThemedClassName<{
  content: string;
  /** Renderers beyond the row's own — a host's link anchor, say. */
  components?: MarkdownViewProps['components'];
}>;

/**
 * A task's description as it appears in a row. Shared by the flat list and the tree so the two
 * paths cannot drift on type scale or clamping; only the placement differs, which is the caller's
 * to supply — the flat row puts it in its own subgrid cell, the tree stacks it under the title
 * inside the heading.
 */
export const TaskDescription = ({ content, components, classNames }: TaskDescriptionProps) => (
  <MarkdownView
    data-testid='taskList.item.description'
    content={content}
    classNames={mx('text-sm text-description line-clamp-3', classNames)}
    // Every block at the row's line height, so the clamp ends on a whole line.
    uniformLineHeight
    // The row supplies the type scale and the clamp, so the description renders as one inline run
    // rather than the block paragraph the default component wraps it in.
    components={{ ...DESCRIPTION_COMPONENTS, ...components }}
  />
);
