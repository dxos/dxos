//
// Copyright 2026 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { MarkdownView } from '@dxos/react-ui-markdown';
import { mx } from '@dxos/ui-theme';

/** A description is a line in a row, not a document: no paragraph block, no heading scale. */
export const DESCRIPTION_COMPONENTS = {
  p: ({ children }: PropsWithChildren) => <span>{children}</span>,
};

export type TaskDescriptionProps = ThemedClassName<{ content: string }>;

/**
 * A task's description as it appears in a row. Shared by the flat list and the tree so the two
 * paths cannot drift on type scale or clamping; only the placement differs, which is the caller's
 * to supply — the flat row puts it in its own subgrid cell, the tree stacks it under the title
 * inside the heading.
 */
export const TaskDescription = ({ content, classNames }: TaskDescriptionProps) => (
  <MarkdownView
    content={content}
    classNames={mx('text-sm text-description line-clamp-3', classNames)}
    // The row supplies the type scale and the clamp, so the description renders as one inline run
    // rather than the block paragraph the default component wraps it in.
    components={DESCRIPTION_COMPONENTS}
  />
);
