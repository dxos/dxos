//
// Copyright 2024 DXOS.org
//

import React, { memo } from 'react';

import { composable } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';

export type TreeItemToggleProps = Omit<Next.ButtonProps, 'icon' | 'size' | 'label'> & {
  open?: boolean;
  isBranch?: boolean;
  hidden?: boolean;
};

/**
 * A row's disclosure control: one control square holding the chevron, rotated when `open`. A leaf
 * renders it invisible rather than not at all, so leaves and branches share one row geometry;
 * `hidden` removes it for a tree that shows no disclosure. Not a tab stop — the row is the
 * focusable, and the machine toggles the branch from its keymap.
 */
export const TreeItemToggle = memo(
  composable<HTMLButtonElement, TreeItemToggleProps>(
    ({ classNames, open, isBranch, hidden, density = 'md', ...props }, forwardedRef) => {
      return (
        <Next.Button
          ref={forwardedRef}
          data-testid='treeItem.toggle'
          aria-expanded={open}
          variant='ghost'
          // Sets the `--dx-control` the square below is measured against, so a denser tree gets a
          // smaller toggle rather than an `md` square in an `sm` grid.
          size={density}
          classNames={[
            // One control tall, not `h-full`: a row with a description is taller than its title
            // line, and stretching the toggle centred the chevron against the whole row instead of
            // against the title it discloses. One control wide too — the same rail-item square as
            // every other cell in a row, so a grid laid out beside it tiles with no gap.
            // Its inline size is the tree's block (`TREE_BLOCK`), so the toggle column holds it exactly.
            'h-(--dx-control) w-6 px-0',
            '[&_svg]:transition-transform [&_svg]:duration-(--duration-tree-disclosure)',
            // Closing holds the turn for the conceal it shares a duration with, so the chevron
            // lands with the last row out; opening leads, and the rows follow it in.
            open ? '[&_svg]:rotate-90 [&_svg]:delay-0' : '[&_svg]:rotate-0 [&_svg]:delay-(--duration-tree-disclosure)',
            hidden ? 'hidden' : !isBranch && 'invisible',
            classNames,
          ]}
          iconSize='xs'
          icon='ph--caret-right--bold'
          iconOnly
          showTooltip={false}
          label={open ? 'Click to close' : 'Click to open'}
          tabIndex={-1}
          {...props}
        />
      );
    },
  ),
);
