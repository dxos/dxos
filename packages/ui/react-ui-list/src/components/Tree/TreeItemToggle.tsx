//
// Copyright 2024 DXOS.org
//

import React, { memo } from 'react';

import { IconButton, type IconButtonProps, composable } from '@dxos/react-ui';

export type TreeItemToggleProps = Omit<IconButtonProps, 'icon' | 'size' | 'label'> & {
  open?: boolean;
  isBranch?: boolean;
  hidden?: boolean;
};

export const TreeItemToggle = memo(
  composable<HTMLButtonElement, TreeItemToggleProps>(
    ({ classNames, open, isBranch, hidden, ...props }, forwardedRef) => {
      return (
        <IconButton
          ref={forwardedRef}
          data-testid='treeItem.toggle'
          aria-expanded={open}
          variant='ghost'
          density='md'
          classNames={[
            // One control tall, not `h-full`: a row with a description is taller than its title
            // line, and stretching the toggle centred the chevron against the whole row instead of
            // against the title it discloses.
            'h-(--dx-control) w-6 px-0',
            '[&_svg]:transition-transform [&_svg]:duration-200',
            open ? '[&_svg]:rotate-90' : '[&_svg]:rotate-0',
            hidden ? 'hidden' : !isBranch && 'invisible',
            classNames,
          ]}
          size={3}
          icon='ph--caret-right--bold'
          iconOnly
          noTooltip
          label={open ? 'Click to close' : 'Click to open'}
          tabIndex={-1}
          {...props}
        />
      );
    },
  ),
);
